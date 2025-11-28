import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * コンプライアンステスト問題の並び順を更新（管理者）
 * POST /api/admin/compliance-test/questions/reorder
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
    const { questionIds } = body

    // バリデーション
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: '問題IDの配列が必要です' },
        { status: 400 }
      )
    }

    // トランザクションで並び順を更新
    await prisma.$transaction(
      questionIds.map((id: string, index: number) =>
        prisma.complianceTestQuestion.update({
          where: { id },
          data: { order: index }
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: '並び順を更新しました'
    })
  } catch (error) {
    console.error('Reorder compliance test questions error:', error)
    return NextResponse.json(
      { error: '並び順の更新に失敗しました' },
      { status: 500 }
    )
  }
}
