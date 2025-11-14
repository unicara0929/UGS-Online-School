import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, Roles } from '@/lib/auth/api-helpers'

/**
 * FPエイド昇格申請一覧を取得
 * GET /api/admin/promotions/fp
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { allowed, error: roleError } = checkRole(authUser!.role, [Roles.ADMIN])
    if (!allowed) return roleError!

    // 昇格申請一覧を取得
    const applications = await prisma.fPPromotionApplication.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDING が先に来る
        { appliedAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      applications
    })
  } catch (error) {
    console.error('Get FP promotion applications error:', error)
    return NextResponse.json(
      { error: '昇格申請一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
