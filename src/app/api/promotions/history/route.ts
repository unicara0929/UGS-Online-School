import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 自分の昇格申請履歴を取得
 * GET /api/promotions/history
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 自分の昇格申請履歴を取得
    const applications = await prisma.promotionApplication.findMany({
      where: {
        userId: authUser!.id,
      },
      orderBy: {
        appliedAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      applications: applications.map((app) => ({
        id: app.id,
        targetRole: app.targetRole,
        status: app.status,
        appliedAt: app.appliedAt,
        approvedAt: app.approvedAt,
        rejectedAt: app.rejectedAt,
        rejectionReason: app.rejectionReason,
      })),
    })
  } catch (error) {
    console.error('[PROMOTIONS_HISTORY_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '昇格申請履歴の取得に失敗しました' },
      { status: 500 }
    )
  }
}
