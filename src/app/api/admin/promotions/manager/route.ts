import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { UserRole } from '@prisma/client'

/**
 * マネージャー昇格申請の一覧を取得（管理者用）
 * GET /api/admin/promotions/manager
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    // マネージャー昇格申請を取得
    const applications = await prisma.promotionApplication.findMany({
      where: {
        targetRole: UserRole.MANAGER,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [
        {
          status: 'asc', // PENDING を最初に表示
        },
        {
          appliedAt: 'desc',
        },
      ],
    })

    return NextResponse.json({
      success: true,
      applications: applications.map((app) => ({
        id: app.id,
        userId: app.userId,
        targetRole: app.targetRole,
        status: app.status,
        appliedAt: app.appliedAt,
        approvedAt: app.approvedAt,
        rejectedAt: app.rejectedAt,
        rejectionReason: app.rejectionReason,
        user: app.user,
      })),
    })
  } catch (error) {
    console.error('[ADMIN_MANAGER_PROMOTIONS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'マネージャー昇格申請の取得に失敗しました' },
      { status: 500 }
    )
  }
}
