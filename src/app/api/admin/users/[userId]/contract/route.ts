import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * 業務委託契約書のステータスを更新
 * PATCH /api/admin/users/[userId]/contract
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック（MANAGER以上）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.MANAGER_AND_ABOVE)
    if (roleError) return roleError

    const { userId } = await context.params
    const body = await request.json()
    const { contractCompleted } = body

    if (typeof contractCompleted !== 'boolean') {
      return NextResponse.json(
        { error: 'contractCompletedは真偽値で指定してください' },
        { status: 400 }
      )
    }

    // 対象ユーザーの存在確認
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 契約ステータスを更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        contractCompleted,
        contractCompletedAt: contractCompleted ? new Date() : null,
        contractCompletedBy: contractCompleted ? authUser!.id : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        contractCompleted: true,
        contractCompletedAt: true,
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })
  } catch (error: any) {
    console.error('契約ステータス更新エラー:', error)
    return NextResponse.json(
      { error: '契約ステータスの更新に失敗しました' },
      { status: 500 }
    )
  }
}
