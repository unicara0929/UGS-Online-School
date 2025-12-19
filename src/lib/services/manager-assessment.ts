import { prisma } from '@/lib/prisma'
import { UserRole, ManagerAssessmentStatus } from '@prisma/client'

/**
 * 査定期間の情報
 */
export interface AssessmentPeriod {
  year: number
  half: 1 | 2 // 1: 上期（1-6月）, 2: 下期（7-12月）
  startMonth: string // YYYY-MM
  endMonth: string   // YYYY-MM
  label: string      // "2025年上期" など
}

/**
 * 現在の査定期間を取得
 */
export function getCurrentAssessmentPeriod(): AssessmentPeriod {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12

  if (month <= 6) {
    // 上期（1-6月）
    return {
      year,
      half: 1,
      startMonth: `${year}-01`,
      endMonth: `${year}-06`,
      label: `${year}年上期`
    }
  } else {
    // 下期（7-12月）
    return {
      year,
      half: 2,
      startMonth: `${year}-07`,
      endMonth: `${year}-12`,
      label: `${year}年下期`
    }
  }
}

/**
 * 指定期間の査定期間情報を取得
 */
export function getAssessmentPeriod(year: number, half: 1 | 2): AssessmentPeriod {
  if (half === 1) {
    return {
      year,
      half: 1,
      startMonth: `${year}-01`,
      endMonth: `${year}-06`,
      label: `${year}年上期`
    }
  } else {
    return {
      year,
      half: 2,
      startMonth: `${year}-07`,
      endMonth: `${year}-12`,
      label: `${year}年下期`
    }
  }
}

/**
 * 期間内の月リストを生成
 */
function getMonthsInPeriod(period: AssessmentPeriod): string[] {
  const months: string[] = []
  const startYear = parseInt(period.startMonth.split('-')[0])
  const startMonth = parseInt(period.startMonth.split('-')[1])
  const endMonth = parseInt(period.endMonth.split('-')[1])

  for (let m = startMonth; m <= endMonth; m++) {
    months.push(`${startYear}-${String(m).padStart(2, '0')}`)
  }
  return months
}

/**
 * MGRの半期売上を集計
 */
export async function calculateManagerSalesForPeriod(
  userId: string,
  period: AssessmentPeriod
): Promise<{
  totalSales: number
  totalInsuredCount: number
  monthlyData: { month: string; salesAmount: number; insuredCount: number }[]
}> {
  const months = getMonthsInPeriod(period)

  const salesRecords = await prisma.managerMonthlySales.findMany({
    where: {
      userId,
      month: { in: months }
    },
    orderBy: { month: 'asc' }
  })

  const totalSales = salesRecords.reduce((sum, r) => sum + r.salesAmount, 0)
  const totalInsuredCount = salesRecords.reduce((sum, r) => sum + r.insuredCount, 0)

  return {
    totalSales,
    totalInsuredCount,
    monthlyData: salesRecords.map(r => ({
      month: r.month,
      salesAmount: r.salesAmount,
      insuredCount: r.insuredCount
    }))
  }
}

/**
 * 半期査定を実行（全MGR対象）
 */
export async function executeHalfYearlyAssessment(
  period: AssessmentPeriod,
  executedBy: string
): Promise<{
  success: boolean
  processedCount: number
  demotionCandidateCount: number
  exemptCount: number
  results: any[]
}> {
  // 全MGRを取得
  const managers = await prisma.user.findMany({
    where: { role: UserRole.MANAGER },
    include: {
      managerRange: true
    }
  })

  // 全レンジを取得
  const ranges = await prisma.managerRange.findMany({
    orderBy: { rangeNumber: 'asc' }
  })
  const rangeMap = new Map(ranges.map(r => [r.rangeNumber, r]))

  const results: any[] = []
  let demotionCandidateCount = 0
  let exemptCount = 0

  for (const manager of managers) {
    // 査定免除期間中かチェック
    const isExempt = manager.assessmentExemptUntil &&
                     new Date(manager.assessmentExemptUntil) > new Date()

    if (isExempt) {
      exemptCount++
      results.push({
        userId: manager.id,
        userName: manager.name,
        isExempt: true,
        status: 'EXEMPT'
      })
      continue
    }

    // 売上データを集計
    const salesData = await calculateManagerSalesForPeriod(manager.id, period)

    // 現在のレンジを取得
    const currentRange = manager.managerRange
    const currentRangeNumber = currentRange?.rangeNumber || 1

    // 判定
    let isDemotionCandidate = false
    let newRangeNumber = currentRangeNumber
    let status: 'MAINTAINED' | 'PROMOTED' | 'DEMOTION_CANDIDATE' = 'MAINTAINED'

    // レンジ別維持条件チェック
    const maintainThreshold = currentRange?.maintainSales || 1200000 // デフォルト120万円

    if (salesData.totalSales < 1200000) {
      // 120万円未満 → 降格候補
      isDemotionCandidate = true
      status = 'DEMOTION_CANDIDATE'
      demotionCandidateCount++
    } else if (currentRangeNumber === 3 && salesData.totalSales < 3000000) {
      // レンジ3で300万円未満 → レンジ2に降格
      newRangeNumber = 2
    } else if (salesData.totalSales >= 2400000 && currentRangeNumber < 3) {
      // 240万円以上 → レンジ3昇級
      newRangeNumber = 3
      status = 'PROMOTED'
    } else if (salesData.totalSales >= 1500000 && currentRangeNumber < 2) {
      // 150万円以上 → レンジ2昇級
      newRangeNumber = 2
      status = 'PROMOTED'
    } else if (salesData.totalSales < maintainThreshold && currentRangeNumber > 1) {
      // 維持条件未達 → 一つ下のレンジへ
      newRangeNumber = currentRangeNumber - 1
    }

    const newRange = rangeMap.get(newRangeNumber)

    // 既存の査定結果があるか確認
    const existingAssessment = await prisma.managerAssessment.findUnique({
      where: {
        userId_periodYear_periodHalf: {
          userId: manager.id,
          periodYear: period.year,
          periodHalf: period.half
        }
      }
    })

    // 査定結果を保存（upsert）
    const assessment = await prisma.managerAssessment.upsert({
      where: {
        userId_periodYear_periodHalf: {
          userId: manager.id,
          periodYear: period.year,
          periodHalf: period.half
        }
      },
      update: {
        totalSales: salesData.totalSales,
        totalInsuredCount: salesData.totalInsuredCount,
        previousRangeId: currentRange?.id,
        newRangeId: newRange?.id,
        isDemotionCandidate,
        status: ManagerAssessmentStatus.PENDING
      },
      create: {
        userId: manager.id,
        periodYear: period.year,
        periodHalf: period.half,
        totalSales: salesData.totalSales,
        totalInsuredCount: salesData.totalInsuredCount,
        previousRangeId: currentRange?.id,
        newRangeId: newRange?.id,
        isDemotionCandidate,
        status: ManagerAssessmentStatus.PENDING
      }
    })

    results.push({
      userId: manager.id,
      userName: manager.name,
      memberId: manager.memberId,
      totalSales: salesData.totalSales,
      totalInsuredCount: salesData.totalInsuredCount,
      previousRange: currentRange?.name,
      newRange: newRange?.name,
      isDemotionCandidate,
      status,
      assessmentId: assessment.id
    })
  }

  return {
    success: true,
    processedCount: managers.length,
    demotionCandidateCount,
    exemptCount,
    results
  }
}

/**
 * 査定結果を確定（個別）
 */
export async function confirmAssessment(
  assessmentId: string,
  confirmedBy: string,
  applyRangeChange: boolean = true
): Promise<{ success: boolean; message: string }> {
  const assessment = await prisma.managerAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      user: true,
      newRange: true
    }
  })

  if (!assessment) {
    return { success: false, message: '査定結果が見つかりません' }
  }

  if (assessment.status !== ManagerAssessmentStatus.PENDING) {
    return { success: false, message: 'この査定は既に確定済みです' }
  }

  // トランザクションで更新
  await prisma.$transaction(async (tx) => {
    // 査定結果を確定
    await tx.managerAssessment.update({
      where: { id: assessmentId },
      data: {
        status: ManagerAssessmentStatus.CONFIRMED,
        confirmedBy,
        confirmedAt: new Date()
      }
    })

    // レンジ変更を適用
    if (applyRangeChange && assessment.newRangeId) {
      await tx.user.update({
        where: { id: assessment.userId },
        data: { managerRangeId: assessment.newRangeId }
      })
    }
  })

  return {
    success: true,
    message: `${assessment.user.name}の査定を確定しました`
  }
}

/**
 * 降格処理を実行
 */
export async function demoteManager(
  assessmentId: string,
  demotedBy: string
): Promise<{ success: boolean; message: string }> {
  const assessment = await prisma.managerAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      user: true
    }
  })

  if (!assessment) {
    return { success: false, message: '査定結果が見つかりません' }
  }

  if (!assessment.isDemotionCandidate) {
    return { success: false, message: 'この査定は降格候補ではありません' }
  }

  // トランザクションで降格処理
  await prisma.$transaction(async (tx) => {
    // 査定結果を降格済みに更新
    await tx.managerAssessment.update({
      where: { id: assessmentId },
      data: {
        status: ManagerAssessmentStatus.DEMOTED,
        confirmedBy: demotedBy,
        confirmedAt: new Date()
      }
    })

    // ユーザーのロールをFPに変更
    await tx.user.update({
      where: { id: assessment.userId },
      data: {
        role: UserRole.FP,
        managerRangeId: null,
        managerDemotedAt: new Date()
      }
    })

    // ロール変更履歴を記録
    await tx.roleChangeHistory.create({
      data: {
        userId: assessment.userId,
        fromRole: UserRole.MANAGER,
        toRole: UserRole.FP,
        reason: '半期査定による降格（売上120万円未満）',
        changedBy: demotedBy
      }
    })
  })

  return {
    success: true,
    message: `${assessment.user.name}をFPエイドに降格しました`
  }
}
