import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * ユーザー統計情報取得API
 * GET /api/admin/users/stats
 *
 * 返却データ:
 * - fpCount: 現在のFPエイド数
 * - memberCount: 現在のUGS会員数
 * - memberToFpPromotions: UGS会員→FPエイド昇格累計数
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    // 並列でデータ取得
    const [fpCount, memberCount, promotionCount] = await Promise.all([
      // FPエイド数
      prisma.user.count({
        where: { role: 'FP' }
      }),

      // UGS会員数
      prisma.user.count({
        where: { role: 'MEMBER' }
      }),

      // UGS会員→FPエイド昇格完了数
      prisma.fPPromotionApplication.count({
        where: { status: 'COMPLETED' }
      })
    ])

    return NextResponse.json({
      success: true,
      stats: {
        fpCount,
        memberCount,
        memberToFpPromotions: promotionCount,
      }
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { success: false, error: 'ユーザー統計情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
