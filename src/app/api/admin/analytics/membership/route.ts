import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * 会員管理分析API
 * 会員ステータス別の統計情報を提供
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 管理者権限チェック
    const adminUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { role: true }
    })

    if (!adminUser || (adminUser.role !== 'ADMIN' && adminUser.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    // 会員ステータス別の集計
    const statusCounts = await prisma.user.groupBy({
      by: ['membershipStatus'],
      _count: true,
    })

    // ロール別の集計
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    })

    // 過去30日間の新規登録数
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const newUsersLast30Days = await prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })

    // 過去30日間の退会数
    const canceledLast30Days = await prisma.user.count({
      where: {
        canceledAt: {
          gte: thirtyDaysAgo
        }
      }
    })

    // 過去30日間のステータス変更
    const statusChangesLast30Days = await prisma.user.count({
      where: {
        membershipStatusChangedAt: {
          gte: thirtyDaysAgo
        }
      }
    })

    // 現在休会中のユーザー数
    const suspendedUsers = await prisma.user.count({
      where: {
        membershipStatus: 'SUSPENDED'
      }
    })

    // 長期滞納ユーザー数
    const delinquentUsers = await prisma.user.count({
      where: {
        membershipStatus: 'DELINQUENT'
      }
    })

    // 支払い遅延ユーザー数
    const pastDueUsers = await prisma.user.count({
      where: {
        membershipStatus: 'PAST_DUE'
      }
    })

    // 有効会員数
    const activeUsers = await prisma.user.count({
      where: {
        membershipStatus: 'ACTIVE'
      }
    })

    // 全ユーザー数
    const totalUsers = await prisma.user.count()

    // 月次統計（過去12ヶ月）
    const monthlyStats = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: monthStart,
            lt: monthEnd
          }
        }
      })

      const canceledUsers = await prisma.user.count({
        where: {
          canceledAt: {
            gte: monthStart,
            lt: monthEnd
          }
        }
      })

      monthlyStats.push({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
        newUsers,
        canceledUsers,
        netGrowth: newUsers - canceledUsers
      })
    }

    // 退会理由の集計
    const cancellationReasons = await prisma.user.groupBy({
      by: ['cancellationReason'],
      where: {
        cancellationReason: {
          not: null
        }
      },
      _count: true,
    })

    // レスポンスデータの整形
    const analytics = {
      overview: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        pastDueUsers,
        delinquentUsers,
        activeRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : '0',
        churnRateLast30Days: totalUsers > 0 ? (canceledLast30Days / totalUsers * 100).toFixed(2) : '0',
      },
      statusBreakdown: statusCounts.map(item => ({
        status: item.membershipStatus,
        count: item._count,
        percentage: totalUsers > 0 ? (item._count / totalUsers * 100).toFixed(2) : '0'
      })),
      roleBreakdown: roleCounts.map(item => ({
        role: item.role,
        count: item._count,
        percentage: totalUsers > 0 ? (item._count / totalUsers * 100).toFixed(2) : '0'
      })),
      recentActivity: {
        newUsersLast30Days,
        canceledLast30Days,
        statusChangesLast30Days,
      },
      monthlyTrends: monthlyStats,
      cancellationReasons: cancellationReasons.map(item => ({
        reason: item.cancellationReason || '未記入',
        count: item._count
      }))
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
