import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { BASIC_TEST_QUESTION_COUNT } from '@/lib/constants/app-config'

/**
 * 基礎テストを作成（管理者）
 * POST /api/admin/basic-test
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { title, questions, passingScore } = await request.json()

    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'タイトルと問題が必要です' },
        { status: 400 }
      )
    }

    // 問題数が規定数であることを確認
    if (questions.length !== BASIC_TEST_QUESTION_COUNT) {
      return NextResponse.json(
        { error: `問題は${BASIC_TEST_QUESTION_COUNT}問である必要があります` },
        { status: 400 }
      )
    }

    // 各問題に正解があることを確認
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      if (!question.question || !question.options || !Array.isArray(question.options) || question.options.length < 2) {
        return NextResponse.json(
          { error: `問題${i + 1}の形式が正しくありません` },
          { status: 400 }
        )
      }
      if (question.correctAnswer === undefined || question.correctAnswer === null) {
        return NextResponse.json(
          { error: `問題${i + 1}に正解が設定されていません` },
          { status: 400 }
        )
      }
    }

    const test = await prisma.basicTest.create({
      data: {
        title,
        questions,
        passingScore: passingScore || 70
      }
    })

    return NextResponse.json({
      success: true,
      test: {
        id: test.id,
        title: test.title,
        questions: test.questions,
        passingScore: test.passingScore
      }
    })
  } catch (error) {
    console.error('Create basic test error:', error)
    return NextResponse.json(
      { error: '基礎テストの作成に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 基礎テスト一覧を取得（管理者）
 * GET /api/admin/basic-test
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const tests = await prisma.basicTest.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: {
            results: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      tests: tests.map(test => ({
        id: test.id,
        title: test.title,
        passingScore: test.passingScore,
        createdAt: test.createdAt,
        resultCount: test._count.results
      }))
    })
  } catch (error) {
    console.error('Get basic tests error:', error)
    return NextResponse.json(
      { error: '基礎テスト一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

