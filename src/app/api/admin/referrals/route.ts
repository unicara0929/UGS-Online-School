import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReferralStatus } from '@prisma/client'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 全ユーザーの紹介一覧を取得（管理者のみ）
 * GET /api/admin/referrals
 * 権限: 管理者のみ
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin && adminError) return adminError

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ReferralStatus | null
    const referrerId = searchParams.get('referrerId')

    // フィルター条件を構築
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (referrerId) {
      where.referrerId = referrerId
    }

    // 全紹介を取得（紹介者と被紹介者の情報を含む）
    const referrals = await prisma.referral.findMany({
      where,
      include: {
        referrer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        referred: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 統計情報を取得
    const stats = {
      total: await prisma.referral.count(),
      pending: await prisma.referral.count({ where: { status: ReferralStatus.PENDING } }),
      approved: await prisma.referral.count({ where: { status: ReferralStatus.APPROVED } }),
      rejected: await prisma.referral.count({ where: { status: ReferralStatus.REJECTED } }),
      rewarded: await prisma.referral.count({ where: { status: ReferralStatus.REWARDED } })
    }

    return NextResponse.json({
      success: true,
      referrals: referrals.map(ref => ({
        id: ref.id,
        referrerId: ref.referrerId,
        referredId: ref.referredId,
        referralType: ref.referralType,
        status: ref.status,
        rewardAmount: ref.rewardAmount,
        rewardPaidAt: ref.rewardPaidAt,
        createdAt: ref.createdAt,
        updatedAt: ref.updatedAt,
        referrer: ref.referrer,
        referred: ref.referred
      })),
      stats
    })
  } catch (error) {
    console.error('Get admin referrals error:', error)
    return NextResponse.json(
      { error: '紹介一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
