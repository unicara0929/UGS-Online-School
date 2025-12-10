import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * マネージャー一覧取得 API
 * 管理者画面でFPエイドに担当マネージャーを割り当てる際に使用
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック（ADMIN のみ）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    // マネージャーロールのユーザーを取得
    const managers = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
        membershipStatus: 'ACTIVE', // アクティブな会員のみ
      },
      select: {
        id: true,
        name: true,
        email: true,
        memberId: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      managers,
    })
  } catch (error) {
    console.error('[MANAGERS_LIST_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'マネージャー一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
