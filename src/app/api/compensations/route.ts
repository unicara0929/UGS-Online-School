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

    // フィルタ条件を構築
    const where: any = {
      userId,
    }

    if (monthFilter) {
      where.month = monthFilter
    }

    // 自分の報酬を取得（新しい順）- 内訳を含む
    const compensations = await prisma.compensation.findMany({
      where,
      include: {
        details: true,
      },
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

    // 総額計算（全件）
    const total = compensations
      .reduce((sum, c) => sum + c.amount, 0)

    // ロール別合計を計算
    const totalByRole = {
      FP: compensations
        .filter((c) => c.earnedAsRole === 'FP')
        .reduce((sum, c) => sum + c.amount, 0),
      MANAGER: compensations
        .filter((c) => c.earnedAsRole === 'MANAGER')
        .reduce((sum, c) => sum + c.amount, 0),
    }

    // 直近6ヶ月の平均（基準月=現在月-1を含む過去6ヶ月）
    // 基準月を計算（現在月の1ヶ月前）
    const now = new Date()
    const baseMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const startMonth = new Date(baseMonth.getFullYear(), baseMonth.getMonth() - 5, 1)

    // 対象期間の月リストを生成（YYYY-MM形式）
    const targetMonths: string[] = []
    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1)
      const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
      targetMonths.push(monthStr)
    }

    // 対象期間の報酬をフィルタリング
    const recentCompensations = compensations.filter(c => targetMonths.includes(c.month))
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
        total,
        totalByRole,
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
