import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReferralStatus, ReferralType } from '@prisma/client'
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

    // 統計情報を取得（ステータス別）
    const [total, pending, approved, rejected, rewarded] = await Promise.all([
      prisma.referral.count(),
      prisma.referral.count({ where: { status: ReferralStatus.PENDING } }),
      prisma.referral.count({ where: { status: ReferralStatus.APPROVED } }),
      prisma.referral.count({ where: { status: ReferralStatus.REJECTED } }),
      prisma.referral.count({ where: { status: ReferralStatus.REWARDED } })
    ])

    // 紹介タイプ別の統計情報を取得
    const [memberTotal, fpTotal, memberApproved, fpApproved] = await Promise.all([
      prisma.referral.count({ where: { referralType: ReferralType.MEMBER } }),
      prisma.referral.count({ where: { referralType: ReferralType.FP } }),
      prisma.referral.count({ where: { referralType: ReferralType.MEMBER, status: { in: [ReferralStatus.APPROVED, ReferralStatus.REWARDED] } } }),
      prisma.referral.count({ where: { referralType: ReferralType.FP, status: { in: [ReferralStatus.APPROVED, ReferralStatus.REWARDED] } } })
    ])

    const stats = {
      total,
      pending,
      approved,
      rejected,
      rewarded,
      // 紹介タイプ別の統計
      byType: {
        member: {
          total: memberTotal,
          approved: memberApproved
        },
        fp: {
          total: fpTotal,
          approved: fpApproved
        }
      }
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
