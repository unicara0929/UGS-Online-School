import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * アンケートを取得
 * GET /api/survey
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // クエリパラメータのuserIdを使わず、認証ユーザーのIDを使用
    const userId = authUser!.id

    // アンケートを取得（最初の1つを取得、将来的に複数対応可能）
    const survey = await prisma.survey.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!survey) {
      return NextResponse.json(
        { error: 'アンケートが見つかりません' },
        { status: 404 }
      )
    }

    // ユーザーの過去の提出を取得
    const userSubmission = await prisma.surveySubmission.findUnique({
      where: {
        userId_surveyId: {
          userId,
          surveyId: survey.id
        }
      }
    })

    return NextResponse.json({
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        questions: survey.questions
      },
      userSubmission: userSubmission ? {
        submittedAt: userSubmission.submittedAt
      } : null
    })
  } catch (error) {
    console.error('Get survey error:', error)
    return NextResponse.json(
      { error: 'アンケートの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * アンケートを提出
 * POST /api/survey/submit
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // MEMBERロールチェック（アンケートはMEMBERのみ）
    const { checkRole, Roles } = await import('@/lib/auth/api-helpers')
    const { allowed, error: roleError } = checkRole(authUser!.role, [Roles.MEMBER])
    if (!allowed) return roleError!

    const { surveyId, answers } = await request.json()

    // リクエストボディのuserIdを使わず、認証ユーザーのIDを使用
    const userId = authUser!.id

    if (!surveyId || !answers) {
      return NextResponse.json(
        { error: 'アンケートID、回答が必要です' },
        { status: 400 }
      )
    }

    // アンケートを取得
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId }
    })

    if (!survey) {
      return NextResponse.json(
        { error: 'アンケートが見つかりません' },
        { status: 404 }
      )
    }

    // 既存の提出をチェック
    const existingSubmission = await prisma.surveySubmission.findUnique({
      where: {
        userId_surveyId: {
          userId,
          surveyId
        }
      }
    })

    if (existingSubmission) {
      return NextResponse.json(
        { error: '既に提出済みです' },
        { status: 409 }
      )
    }

    // 提出を保存
    const submission = await prisma.surveySubmission.create({
      data: {
        userId,
        surveyId,
        answers,
        submittedAt: new Date()
      }
    })

    // FPPromotionApplicationのsurveyCompletedを更新
    try {
      await prisma.fPPromotionApplication.update({
        where: { userId },
        data: {
          surveyCompleted: true
        }
      })
    } catch (error: any) {
      // FPPromotionApplicationが存在しない場合は作成
      if (error.code === 'P2025') {
        await prisma.fPPromotionApplication.create({
          data: {
            userId,
            surveyCompleted: true
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        submittedAt: submission.submittedAt
      }
    })
  } catch (error: any) {
    console.error('Submit survey error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '既に提出済みです' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'アンケートの提出に失敗しました' },
      { status: 500 }
    )
  }
}

