import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * コンプライアンステスト問題詳細を取得（管理者）
 * GET /api/admin/compliance-test/questions/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const question = await prisma.complianceTestQuestion.findUnique({
      where: { id }
    })

    if (!question) {
      return NextResponse.json(
        { error: 'コンプライアンステスト問題が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      question
    })
  } catch (error) {
    console.error('Get compliance test question error:', error)
    return NextResponse.json(
      { error: 'コンプライアンステスト問題の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * コンプライアンステスト問題を更新（管理者）
 * PATCH /api/admin/compliance-test/questions/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const { question, options, correctAnswer, explanation, category, order, isActive } = body

    // 既存の問題を取得
    const existingQuestion = await prisma.complianceTestQuestion.findUnique({
      where: { id }
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'コンプライアンステスト問題が見つかりません' },
        { status: 404 }
      )
    }

    // バリデーション
    if (options !== undefined) {
      if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
        return NextResponse.json(
          { error: '選択肢は2〜6個の配列である必要があります' },
          { status: 400 }
        )
      }
    }

    const optionsToCheck = options || existingQuestion.options as string[]
    if (correctAnswer !== undefined) {
      if (correctAnswer < 0 || correctAnswer >= optionsToCheck.length) {
        return NextResponse.json(
          { error: '正解のインデックスが選択肢の範囲外です' },
          { status: 400 }
        )
      }
    }

    // 更新データを構築
    const updateData: any = {
      updatedAt: new Date()
    }

    if (question !== undefined) updateData.question = question
    if (options !== undefined) updateData.options = options
    if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer
    if (explanation !== undefined) updateData.explanation = explanation
    if (category !== undefined) updateData.category = category
    if (order !== undefined) updateData.order = order
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedQuestion = await prisma.complianceTestQuestion.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      question: updatedQuestion
    })
  } catch (error) {
    console.error('Update compliance test question error:', error)
    return NextResponse.json(
      { error: 'コンプライアンステスト問題の更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * コンプライアンステスト問題を削除（管理者）
 * DELETE /api/admin/compliance-test/questions/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    // 既存の問題を取得
    const existingQuestion = await prisma.complianceTestQuestion.findUnique({
      where: { id }
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'コンプライアンステスト問題が見つかりません' },
        { status: 404 }
      )
    }

    // 削除
    await prisma.complianceTestQuestion.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'コンプライアンステスト問題を削除しました'
    })
  } catch (error) {
    console.error('Delete compliance test question error:', error)
    return NextResponse.json(
      { error: 'コンプライアンステスト問題の削除に失敗しました' },
      { status: 500 }
    )
  }
}
