import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'
import { getCurrentAssessmentPeriod, calculateManagerSalesForPeriod } from '@/lib/services/manager-assessment'
import { UserRole } from '@prisma/client'

/**
 * MGRダッシュボードデータ取得
 * GET /api/manager/dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // MGRロールチェック
    if (authUser!.role !== UserRole.MANAGER) {
      return NextResponse.json(
        { success: false, error: 'マネージャー権限が必要です' },
        { status: 403 }
      )
    }

    const userId = authUser!.id

    // ユーザー情報とレンジを取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        memberId: true,
        managerPromotedAt: true,
        assessmentExemptUntil: true,
        managerRange: {
          select: {
            id: true,
            rangeNumber: true,
            name: true,
            maintainSales: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 今期の売上進捗
    const currentPeriod = getCurrentAssessmentPeriod()
    const salesData = await calculateManagerSalesForPeriod(userId, currentPeriod)

    // 維持基準（レンジに応じた）
    const maintainThreshold = user.managerRange?.maintainSales || 1200000

    // 配下FP一覧
    const teamMembers = await prisma.user.findMany({
      where: {
        managerId: userId,
        role: { in: [UserRole.FP, UserRole.MANAGER] }
      },
      select: {
        id: true,
        name: true,
        memberId: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    })

    // 査定免除中かチェック
    const isExempt = user.assessmentExemptUntil &&
                     new Date(user.assessmentExemptUntil) > new Date()
    const exemptDaysRemaining = isExempt && user.assessmentExemptUntil
      ? Math.ceil((new Date(user.assessmentExemptUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    // 次回査定日
    const now = new Date()
    let nextAssessmentDate: Date
    if (now.getMonth() < 6) {
      // 上期中 → 7月1日
      nextAssessmentDate = new Date(now.getFullYear(), 6, 1)
    } else {
      // 下期中 → 翌年1月1日
      nextAssessmentDate = new Date(now.getFullYear() + 1, 0, 1)
    }
    const daysUntilAssessment = Math.ceil(
      (nextAssessmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    // 直近の査定結果
    const latestAssessment = await prisma.managerAssessment.findFirst({
      where: { userId, status: 'CONFIRMED' },
      orderBy: [
        { periodYear: 'desc' },
        { periodHalf: 'desc' }
      ],
      include: {
        previousRange: true,
        newRange: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        // 基本情報
        range: user.managerRange,
        promotedAt: user.managerPromotedAt,

        // 今期売上進捗
        currentPeriod: {
          label: currentPeriod.label,
          totalSales: salesData.totalSales,
          totalInsuredCount: salesData.totalInsuredCount,
          maintainThreshold,
          progressPercent: Math.min(100, Math.round((salesData.totalSales / maintainThreshold) * 100)),
          monthlyData: salesData.monthlyData
        },

        // 査定免除
        exemption: {
          isExempt,
          exemptUntil: user.assessmentExemptUntil,
          daysRemaining: exemptDaysRemaining
        },

        // 次回査定
        nextAssessment: {
          date: nextAssessmentDate.toISOString(),
          daysRemaining: daysUntilAssessment
        },

        // 配下FP
        team: {
          members: teamMembers,
          count: teamMembers.length
        },

        // 直近査定結果
        latestAssessment: latestAssessment ? {
          period: `${latestAssessment.periodYear}年${latestAssessment.periodHalf === 1 ? '上期' : '下期'}`,
          totalSales: latestAssessment.totalSales,
          previousRange: latestAssessment.previousRange?.name,
          newRange: latestAssessment.newRange?.name,
          confirmedAt: latestAssessment.confirmedAt
        } : null
      }
    })
  } catch (error) {
    console.error('[MANAGER_DASHBOARD_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'データの取得に失敗しました' },
      { status: 500 }
    )
  }
}
