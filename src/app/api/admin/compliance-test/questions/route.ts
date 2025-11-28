import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * コンプライアンステスト問題一覧を取得（管理者）
 * GET /api/admin/compliance-test/questions
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const questions = await prisma.complianceTestQuestion.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { answers: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      questions: questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        category: q.category,
        order: q.order,
        isActive: q.isActive,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        answerCount: q._count.answers
      }))
    })
  } catch (error) {
    console.error('Get compliance test questions error:', error)
    return NextResponse.json(
      { error: 'コンプライアンステスト問題の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * コンプライアンステスト問題を新規作成（管理者）
 * POST /api/admin/compliance-test/questions
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const { question, options, correctAnswer, explanation, category, order, isActive } = body

    // バリデーション
    if (!question || !options || correctAnswer === undefined) {
      return NextResponse.json(
        { error: '設問、選択肢、正解は必須です' },
        { status: 400 }
      )
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return NextResponse.json(
        { error: '選択肢は2〜6個の配列である必要があります' },
        { status: 400 }
      )
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
      return NextResponse.json(
        { error: '正解のインデックスが選択肢の範囲外です' },
        { status: 400 }
      )
    }

    // 順序が指定されていない場合は最後に追加
    let questionOrder = order
    if (questionOrder === undefined) {
      const maxOrder = await prisma.complianceTestQuestion.aggregate({
        _max: { order: true }
      })
      questionOrder = (maxOrder._max.order ?? -1) + 1
    }

    const newQuestion = await prisma.complianceTestQuestion.create({
      data: {
        question,
        options,
        correctAnswer,
        explanation: explanation || null,
        category: category || null,
        order: questionOrder,
        isActive: isActive ?? true
      }
    })

    return NextResponse.json({
      success: true,
      question: newQuestion
    })
  } catch (error) {
    console.error('Create compliance test question error:', error)
    return NextResponse.json(
      { error: 'コンプライアンステスト問題の作成に失敗しました' },
      { status: 500 }
    )
  }
}
