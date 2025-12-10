import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * ユーザーの担当マネージャー更新 API
 * FPエイドに担当マネージャーを割り当てる
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック（ADMIN のみ）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    const { userId } = await context.params
    const body = await request.json()
    const { managerId } = body

    // 対象ユーザーを取得
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // FPエイドのみ担当マネージャーを設定可能
    if (targetUser.role !== 'FP') {
      return NextResponse.json(
        { success: false, error: '担当マネージャーはFPエイドにのみ設定できます' },
        { status: 400 }
      )
    }

    // managerIdが指定されている場合、マネージャーの存在確認
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: {
          id: true,
          role: true,
          membershipStatus: true,
        },
      })

      if (!manager) {
        return NextResponse.json(
          { success: false, error: '指定されたマネージャーが見つかりません' },
          { status: 404 }
        )
      }

      if (manager.role !== 'MANAGER') {
        return NextResponse.json(
          { success: false, error: '指定されたユーザーはマネージャーではありません' },
          { status: 400 }
        )
      }
    }

    // 担当マネージャーを更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        managerId: managerId || null, // nullの場合は紐づけ解除
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    console.log('[MANAGER_ASSIGNMENT]', {
      userId,
      userName: targetUser.name,
      managerId: managerId || 'UNASSIGNED',
      managerName: updatedUser.manager?.name || null,
      assignedBy: authUser!.id,
      at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: managerId
        ? `${targetUser.name}の担当マネージャーを${updatedUser.manager?.name}に設定しました`
        : `${targetUser.name}の担当マネージャーを解除しました`,
      user: {
        id: updatedUser.id,
        managerId: updatedUser.managerId,
        manager: updatedUser.manager,
      },
    })
  } catch (error) {
    console.error('[MANAGER_ASSIGNMENT_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '担当マネージャーの更新に失敗しました' },
      { status: 500 }
    )
  }
}
