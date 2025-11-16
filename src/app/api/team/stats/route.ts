import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const userId = authUser!.id
    const userRole = authUser!.role

    // MANAGER または ADMIN のみアクセス可能
    if (!['MANAGER', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'この機能にアクセスする権限がありません' },
        { status: 403 }
      )
    }

    // 承認済みの紹介を取得
    const approvedReferrals = await prisma.referral.findMany({
      where: {
        referrerId: userId,
        status: 'APPROVED',
      },
      include: {
        referred: {
          include: {
            subscriptions: {
              select: {
                status: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
            courseProgress: {
              where: {
                isCompleted: true,
              },
            },
            contracts: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
        },
      },
    })

    // 統計情報を計算
    const totalMembers = approvedReferrals.length

    const activeMembers = approvedReferrals.filter((ref) => {
      const subscription = ref.referred.subscriptions[0]
      return subscription && subscription.status === 'ACTIVE'
    }).length

    const totalCompletedLessons = approvedReferrals.reduce((sum, ref) => {
      return sum + ref.referred.courseProgress.length
    }, 0)

    const totalActiveContracts = approvedReferrals.reduce((sum, ref) => {
      return sum + ref.referred.contracts.length
    }, 0)

    // ロール別の内訳
    const roleBreakdown = approvedReferrals.reduce(
      (acc, ref) => {
        const role = ref.referred.role
        acc[role] = (acc[role] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // 紹介タイプ別の内訳
    const referralTypeBreakdown = approvedReferrals.reduce(
      (acc, ref) => {
        const type = ref.referralType
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // 平均学習進捗
    const avgCompletedLessons =
      totalMembers > 0 ? Math.round(totalCompletedLessons / totalMembers) : 0

    const stats = {
      totalMembers,
      activeMembers,
      totalCompletedLessons,
      avgCompletedLessons,
      totalActiveContracts,
      roleBreakdown,
      referralTypeBreakdown,
    }

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error('[TEAM_STATS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'チーム統計情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
