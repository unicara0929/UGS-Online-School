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

    // FP、MANAGER、ADMIN のみアクセス可能
    if (!['FP', 'MANAGER', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'この機能にアクセスする権限がありません' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const monthFilter = searchParams.get('month') // YYYY-MM format
    const statusFilter = searchParams.get('status') as 'PENDING' | 'CONFIRMED' | 'PAID' | null

    // フィルタ条件を構築
    const where: any = {
      userId,
    }

    if (monthFilter) {
      where.month = monthFilter
    }

    if (statusFilter) {
      where.status = statusFilter
    }

    // 自分の報酬を取得（新しい順）
    const compensations = await prisma.compensation.findMany({
      where,
      orderBy: {
        month: 'desc',
      },
    })

    // 統計情報を計算
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .slice(0, 7)

    const currentMonthCompensation = compensations.find((c) => c.month === currentMonth)
    const lastMonthCompensation = compensations.find((c) => c.month === lastMonth)

    // 総額計算（支払済みのみ）
    const totalPaid = compensations
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + c.amount, 0)

    // 直近3ヶ月の平均
    const recentCompensations = compensations.slice(0, 3)
    const recentAverage =
      recentCompensations.length > 0
        ? Math.round(
            recentCompensations.reduce((sum, c) => sum + c.amount, 0) /
              recentCompensations.length
          )
        : 0

    // 前月比増加率
    let trend = 0
    if (currentMonthCompensation && lastMonthCompensation && lastMonthCompensation.amount > 0) {
      trend = Number(
        (
          ((currentMonthCompensation.amount - lastMonthCompensation.amount) /
            lastMonthCompensation.amount) *
          100
        ).toFixed(1)
      )
    }

    return NextResponse.json({
      success: true,
      compensations,
      stats: {
        currentMonth: currentMonthCompensation || null,
        lastMonth: lastMonthCompensation || null,
        total: totalPaid,
        recentAverage,
        trend,
      },
    })
  } catch (error) {
    console.error('[COMPENSATIONS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '報酬情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
