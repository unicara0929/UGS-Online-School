import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 基礎テストを取得
 * GET /api/basic-test
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // クエリパラメータのuserIdを使わず、認証ユーザーのIDを使用
    const userId = authUser!.id

    // 基礎テストを取得（最初の1つを取得、将来的に複数対応可能）
    const test = await prisma.basicTest.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!test) {
      return NextResponse.json(
        { error: '基礎テストが見つかりません' },
        { status: 404 }
      )
    }

    // ユーザーの過去の結果を取得
    const userResult = await prisma.basicTestResult.findUnique({
      where: {
        userId_testId: {
          userId,
          testId: test.id
        }
      }
    })

    return NextResponse.json({
      success: true,
      test: {
        id: test.id,
        title: test.title,
        questions: test.questions,
        passingScore: test.passingScore
      },
      userResult: userResult ? {
        score: userResult.score,
        isPassed: userResult.isPassed,
        completedAt: userResult.completedAt
      } : null
    })
  } catch (error) {
    console.error('Get basic test error:', error)
    return NextResponse.json(
      { error: '基礎テストの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 基礎テストを提出
 * POST /api/basic-test/submit
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // MEMBERロールチェック（基礎テストはMEMBERのみ）
    const { checkRole, Roles } = await import('@/lib/auth/api-helpers')
    const { allowed, error: roleError } = checkRole(authUser!.role, [Roles.MEMBER])
    if (!allowed) return roleError!

    const { testId, answers } = await request.json()

    // リクエストボディのuserIdを使わず、認証ユーザーのIDを使用
    const userId = authUser!.id

    if (!testId || !answers) {
      return NextResponse.json(
        { error: 'テストID、回答が必要です' },
        { status: 400 }
      )
    }

    // テストを取得
    const test = await prisma.basicTest.findUnique({
      where: { id: testId }
    })

    if (!test) {
      return NextResponse.json(
        { error: 'テストが見つかりません' },
        { status: 404 }
      )
    }

    // 既存の結果をチェック
    const existingResult = await prisma.basicTestResult.findUnique({
      where: {
        userId_testId: {
          userId,
          testId
        }
      }
    })

    if (existingResult && existingResult.isPassed) {
      return NextResponse.json(
        { error: '既に合格済みです' },
        { status: 400 }
      )
    }

    // 採点
    const questions = test.questions as any[]
    let correctCount = 0
    const totalQuestions = questions.length

    for (let i = 0; i < totalQuestions; i++) {
      const question = questions[i]
      const userAnswer = answers[i]
      if (question.correctAnswer === userAnswer) {
        correctCount++
      }
    }

    const score = Math.round((correctCount / totalQuestions) * 100)
    const isPassed = score >= test.passingScore

    // 結果を保存
    const result = await prisma.basicTestResult.upsert({
      where: {
        userId_testId: {
          userId,
          testId
        }
      },
      create: {
        userId,
        testId,
        score,
        answers,
        isPassed,
        completedAt: new Date()
      },
      update: {
        score,
        answers,
        isPassed,
        completedAt: new Date()
      }
    })

    // 合格した場合、FPPromotionApplicationのbasicTestCompletedを更新
    if (isPassed) {
      try {
        await prisma.fPPromotionApplication.update({
          where: { userId },
          data: {
            basicTestCompleted: true
          }
        })
      } catch (error: any) {
        // FPPromotionApplicationが存在しない場合は作成
        if (error.code === 'P2025') {
          await prisma.fPPromotionApplication.create({
            data: {
              userId,
              basicTestCompleted: true
            }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      result: {
        score,
        isPassed,
        correctCount,
        totalQuestions,
        completedAt: result.completedAt
      }
    })
  } catch (error: any) {
    console.error('Submit basic test error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '既に回答済みです' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'テストの提出に失敗しました' },
      { status: 500 }
    )
  }
}

