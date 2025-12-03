import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { Resend } from 'resend'

// 遅延初期化（ビルド時のエラーを回避）
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * 自分の事前アンケート回答状況を取得
 * GET /api/pre-interview
 * 権限: 認証済みユーザー
 */
export async function GET(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 自分のLP面談に関連する事前アンケートを取得
    const response = await prisma.preInterviewResponse.findFirst({
      where: {
        respondentId: authUser!.id
      },
      include: {
        template: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          }
        },
        answers: true,
        lpMeeting: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            fp: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!response) {
      return NextResponse.json({
        success: true,
        response: null,
        message: '事前アンケートはありません'
      })
    }

    return NextResponse.json({
      success: true,
      response
    })
  } catch (error) {
    console.error('Get pre-interview response error:', error)
    return NextResponse.json(
      { error: '事前アンケートの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 事前アンケート回答の保存（途中保存・完了）
 * POST /api/pre-interview
 * 権限: 認証済みユーザー（自分の回答のみ）
 */
export async function POST(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { responseId, answers, isComplete } = body

    if (!responseId || !answers) {
      return NextResponse.json(
        { error: '回答データが不正です' },
        { status: 400 }
      )
    }

    // 回答権限の確認
    const existingResponse = await prisma.preInterviewResponse.findFirst({
      where: {
        id: responseId,
        respondentId: authUser!.id
      },
      include: {
        template: {
          include: {
            questions: true
          }
        }
      }
    })

    if (!existingResponse) {
      return NextResponse.json(
        { error: '事前アンケートが見つからないか、アクセス権限がありません' },
        { status: 404 }
      )
    }

    if (existingResponse.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'すでに回答済みです' },
        { status: 400 }
      )
    }

    // 完了時は必須項目のチェック
    if (isComplete) {
      const requiredQuestions = existingResponse.template.questions.filter(q => q.required)
      for (const question of requiredQuestions) {
        const answer = answers.find((a: any) => a.questionId === question.id)
        if (!answer || !answer.value || (Array.isArray(answer.value) && answer.value.length === 0)) {
          return NextResponse.json(
            { error: `必須項目「${question.question}」に回答してください` },
            { status: 400 }
          )
        }
      }
    }

    // トランザクションで回答を保存
    const updatedResponse = await prisma.$transaction(async (tx) => {
      // 既存の回答を削除
      await tx.preInterviewAnswer.deleteMany({
        where: { responseId }
      })

      // 新しい回答を作成
      if (answers.length > 0) {
        await tx.preInterviewAnswer.createMany({
          data: answers.map((a: any) => ({
            responseId,
            questionId: a.questionId,
            value: a.value
          }))
        })
      }

      // ステータス更新
      return tx.preInterviewResponse.update({
        where: { id: responseId },
        data: {
          status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
          startedAt: existingResponse.startedAt || new Date(),
          completedAt: isComplete ? new Date() : null
        },
        include: {
          template: {
            include: {
              questions: {
                orderBy: { order: 'asc' }
              }
            }
          },
          answers: true,
          lpMeeting: {
            include: {
              fp: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              member: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })
    })

    // 完了時は管理者へアプリ内通知とメール通知を送信
    if (isComplete && updatedResponse.lpMeeting) {
      const memberName = updatedResponse.lpMeeting.member?.name || '面談者'

      // 管理者を取得
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, email: true, name: true }
      })

      // 管理者へのアプリ内通知
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'PRE_INTERVIEW_COMPLETED',
            priority: 'INFO',
            title: '事前アンケート回答完了',
            message: `${memberName}さんがLP面談の事前アンケートに回答しました。`,
            actionUrl: `/dashboard/admin/lp-meetings`
          }
        })
      }

      // 管理者へのメール通知
      const resend = getResend()
      for (const admin of admins) {
        try {
          await resend.emails.send({
            from: 'UGSオンラインスクール <inc@unicara.jp>',
            to: admin.email,
            subject: `【UGS】事前アンケート回答完了 - ${memberName}さん`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e293b;">事前アンケート回答完了のお知らせ</h2>
                <p>${admin.name}さん</p>
                <p><strong>${memberName}</strong>さんがLP面談の事前アンケートに回答しました。</p>
                <p>管理画面から回答内容を確認してください。</p>
                <div style="margin: 24px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/lp-meetings"
                     style="background-color: #f08300; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    LP面談管理画面を開く
                  </a>
                </div>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #64748b; font-size: 12px;">
                  このメールはUGSオンラインスクールから自動送信されています。
                </p>
              </div>
            `
          })
          console.log(`Pre-interview completion email sent to admin: ${admin.email}`)
        } catch (emailError) {
          console.error(`Failed to send pre-interview email to ${admin.email}:`, emailError)
        }
      }

      // 通知送信日時を記録
      await prisma.preInterviewResponse.update({
        where: { id: responseId },
        data: {
          completionNotifiedAt: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      response: updatedResponse,
      message: isComplete ? '事前アンケートを送信しました' : '回答を保存しました'
    })
  } catch (error) {
    console.error('Save pre-interview response error:', error)
    return NextResponse.json(
      { error: '回答の保存に失敗しました' },
      { status: 500 }
    )
  }
}
