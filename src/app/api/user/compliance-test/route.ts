import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { supabaseAdmin } from '@/lib/supabase'

const PASSING_SCORE = 90 // 合格ライン 90%

/**
 * コンプライアンステストの問題を取得
 * GET /api/user/compliance-test
 * 権限: FPエイドまたはFP昇格申請が承認されたMEMBER
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // ユーザーの状況を確認
    const user = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: {
        role: true,
        fpPromotionApproved: true,
        complianceTestPassed: true,
        complianceTestPassedAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // FPまたは承認済みMEMBERかチェック（fpPromotionApprovedフラグを使用）
    if (user.role.toLowerCase() !== 'fp' && !user.fpPromotionApproved) {
      return NextResponse.json(
        { error: 'FP昇格申請が承認されていません' },
        { status: 403 }
      )
    }

    // 有効な問題を取得（正解は除外）
    const questions = await prisma.complianceTestQuestion.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        question: true,
        options: true,
        category: true,
        order: true
      }
    })

    // 過去の受験履歴
    const attempts = await prisma.complianceTestAttempt.findMany({
      where: { userId: authUser!.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        totalQuestions: true,
        correctCount: true,
        score: true,
        isPassed: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      isPassed: user?.complianceTestPassed || false,
      passedAt: user?.complianceTestPassedAt || null,
      questions,
      attempts,
      passingScore: PASSING_SCORE
    })
  } catch (error) {
    console.error('Get compliance test error:', error)
    return NextResponse.json(
      { error: 'コンプライアンステストの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * コンプライアンステストを提出
 * POST /api/user/compliance-test
 * 権限: FPエイドまたはFP昇格申請が承認されたMEMBER
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 現在のユーザー情報を取得
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: {
        email: true,
        role: true,
        fpPromotionApproved: true,
        managerContactConfirmedAt: true,
        fpOnboardingCompleted: true,
        compensationBankAccount: { select: { id: true } }
      }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // FPまたは承認済みMEMBERかチェック（fpPromotionApprovedフラグを使用）
    if (currentUser.role.toLowerCase() !== 'fp' && !currentUser.fpPromotionApproved) {
      return NextResponse.json(
        { error: 'FP昇格申請が承認されていません' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { answers } = body // { [questionId]: selectedAnswer }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { error: '回答が必要です' },
        { status: 400 }
      )
    }

    // 有効な問題を取得
    const questions = await prisma.complianceTestQuestion.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'テスト問題が設定されていません' },
        { status: 400 }
      )
    }

    // 採点
    let correctCount = 0
    const answerResults: { questionId: string; selectedAnswer: number; isCorrect: boolean }[] = []

    for (const question of questions) {
      const selectedAnswer = answers[question.id]
      if (selectedAnswer === undefined) {
        // 未回答は不正解
        answerResults.push({
          questionId: question.id,
          selectedAnswer: -1,
          isCorrect: false
        })
      } else {
        const isCorrect = selectedAnswer === question.correctAnswer
        if (isCorrect) correctCount++
        answerResults.push({
          questionId: question.id,
          selectedAnswer,
          isCorrect
        })
      }
    }

    const score = (correctCount / questions.length) * 100
    const isPassed = score >= PASSING_SCORE

    // 受験履歴を保存
    const attempt = await prisma.complianceTestAttempt.create({
      data: {
        userId: authUser!.id,
        totalQuestions: questions.length,
        correctCount,
        score,
        isPassed,
        completedAt: new Date(),
        answers: {
          create: answerResults.map(a => ({
            questionId: a.questionId,
            selectedAnswer: a.selectedAnswer,
            isCorrect: a.isCorrect
          }))
        }
      },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                question: true,
                options: true,
                correctAnswer: true,
                explanation: true,
                category: true
              }
            }
          }
        }
      }
    })

    // 合格した場合の処理
    let promoted = false
    if (isPassed) {
      // ユーザーの合格フラグを更新
      await prisma.user.update({
        where: { id: authUser!.id },
        data: {
          complianceTestPassed: true,
          complianceTestPassedAt: new Date()
        }
      })

      // オンボーディング完了チェック → FP昇格（承認済みの場合のみ）
      if (currentUser.fpPromotionApproved) {
        const allOnboardingComplete =
          currentUser.managerContactConfirmedAt !== null &&
          currentUser.fpOnboardingCompleted === true &&
          currentUser.compensationBankAccount !== null
          // complianceTestPassed は今更新したので true とみなす

        if (allOnboardingComplete) {
          // 承認済みの申請を取得（ステータス更新用）
          const approvedApplication = await prisma.fPPromotionApplication.findFirst({
            where: {
              userId: authUser!.id,
              status: 'APPROVED'
            }
          })

          // 全オンボーディング完了 → FPロールに昇格
          await prisma.user.update({
            where: { id: authUser!.id },
            data: {
              role: UserRole.FP,
              fpPromotionApproved: false // 昇格完了後はフラグをリセット
            }
          })

          // 申請ステータスをCOMPLETEDに更新
          if (approvedApplication) {
            await prisma.fPPromotionApplication.update({
              where: { id: approvedApplication.id },
              data: {
                status: 'COMPLETED',
                completedAt: new Date()
              }
            })
          }

          // Supabaseのロールも更新
          try {
            const supabaseUser = await supabaseAdmin.auth.admin.listUsers()
            const supaUser = supabaseUser.data.users.find(u => u.email === currentUser.email)

            if (supaUser) {
              await supabaseAdmin.auth.admin.updateUserById(supaUser.id, {
                user_metadata: {
                  ...supaUser.user_metadata,
                  role: 'fp'
                }
              })
            }
          } catch (supabaseError) {
            console.error('Failed to update Supabase user role:', supabaseError)
          }

          promoted = true
          console.log('All onboarding steps completed, user promoted to FP:', authUser!.id)
        }
      }
    }

    // 結果を返す（不正解の問題には解説を含める）
    const results = attempt.answers.map(a => ({
      questionId: a.questionId,
      question: a.question.question,
      options: a.question.options,
      selectedAnswer: a.selectedAnswer,
      correctAnswer: a.question.correctAnswer,
      isCorrect: a.isCorrect,
      explanation: !a.isCorrect ? a.question.explanation : null,
      category: a.question.category
    }))

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      totalQuestions: questions.length,
      correctCount,
      score,
      isPassed,
      passingScore: PASSING_SCORE,
      results,
      promoted
    })
  } catch (error) {
    console.error('Submit compliance test error:', error)
    return NextResponse.json(
      { error: 'コンプライアンステストの提出に失敗しました' },
      { status: 500 }
    )
  }
}
