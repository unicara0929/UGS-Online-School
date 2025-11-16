import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 紹介実績を取得
 * GET /api/user/referral-stats
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 紹介実績を集計
    const totalReferrals = await prisma.referral.count({
      where: { referrerId: authUser!.id }
    })

    const approvedReferrals = await prisma.referral.count({
      where: {
        referrerId: authUser!.id,
        status: { in: ['APPROVED', 'REWARDED'] }
      }
    })

    const pendingReferrals = await prisma.referral.count({
      where: {
        referrerId: authUser!.id,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      totalReferrals,
      approvedReferrals,
      pendingReferrals
    })
  } catch (error) {
    console.error('Get referral stats error:', error)
    return NextResponse.json(
      { error: '紹介実績の取得に失敗しました' },
      { status: 500 }
    )
  }
}
