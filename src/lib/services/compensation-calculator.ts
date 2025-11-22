import { prisma } from '@/lib/prisma'
import { ReferralStatus, ContractStatus } from '@prisma/client'

/**
 * 報酬計算の内訳
 */
export interface CompensationBreakdown {
  memberReferral: number  // UGS会員紹介報酬
  fpReferral: number      // FPエイド紹介報酬
  contract: number        // 契約報酬
  bonus: number           // ボーナス・インセンティブ
  deduction: number       // 控除
}

/**
 * 月次報酬を計算
 * @param userId ユーザーID
 * @param month 対象月（YYYY-MM形式）
 * @returns 報酬内訳
 */
export async function calculateMonthlyCompensation(
  userId: string,
  month: string
): Promise<CompensationBreakdown> {
  const breakdown: CompensationBreakdown = {
    memberReferral: 0,
    fpReferral: 0,
    contract: 0,
    bonus: 0,
    deduction: 0
  }

  // 月の開始日と終了日を計算
  const [year, monthNum] = month.split('-').map(Number)
  const startDate = new Date(year, monthNum - 1, 1)
  const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)

  // 1. UGS会員紹介報酬を計算（報酬なしのため0）
  // 紹介報酬は現在無効化されています
  breakdown.memberReferral = 0

  // 2. FPエイド紹介報酬を計算（報酬なしのため0）
  // 紹介報酬は現在無効化されています
  breakdown.fpReferral = 0

  // 3. 契約報酬を計算
  const contracts = await prisma.contract.findMany({
    where: {
      userId,
      status: ContractStatus.ACTIVE,
      signedAt: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  breakdown.contract = contracts.reduce((sum, contract) => {
    return sum + (contract.rewardAmount || 0)
  }, 0)

  // 4. ボーナス・インセンティブ（現時点では0、将来的に拡張可能）
  breakdown.bonus = 0

  // 5. 控除（現時点では0、将来的に拡張可能）
  breakdown.deduction = 0

  return breakdown
}

/**
 * 報酬総額を計算
 */
export function calculateTotalCompensation(breakdown: CompensationBreakdown): number {
  return breakdown.memberReferral +
         breakdown.fpReferral +
         breakdown.contract +
         breakdown.bonus -
         breakdown.deduction
}

/**
 * 直近Nヶ月の平均報酬を計算
 * 基準月（現在月の1ヶ月前）を含む過去N月分を対象とする
 * 例: 現在が11月の場合、基準月は10月。6ヶ月指定なら5月〜10月が対象
 * @param userId ユーザーID
 * @param months 月数（デフォルト: 6）
 * @returns 平均報酬額
 */
export async function calculateAverageCompensation(
  userId: string,
  months: number = 6
): Promise<number> {
  // 基準月を計算（現在月の1ヶ月前）
  const now = new Date()
  const baseMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  // 対象期間の開始月を計算（基準月を含む過去N月分）
  const startMonth = new Date(baseMonth.getFullYear(), baseMonth.getMonth() - (months - 1), 1)

  // 対象期間の月リストを生成（YYYY-MM形式）
  const targetMonths: string[] = []
  for (let i = 0; i < months; i++) {
    const targetDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1)
    const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
    targetMonths.push(monthStr)
  }

  const compensations = await prisma.compensation.findMany({
    where: {
      userId,
      status: {
        in: ['CONFIRMED', 'PAID']
      },
      month: {
        in: targetMonths
      }
    },
    orderBy: {
      month: 'desc'
    }
  })

  if (compensations.length === 0) {
    return 0
  }

  const total = compensations.reduce((sum, comp) => sum + comp.amount, 0)
  return Math.floor(total / compensations.length)
}

/**
 * 紹介実績を取得
 * 基準月（現在月の1ヶ月前）を含む過去N月分を対象とする
 * 例: 現在が11月の場合、基準月は10月。6ヶ月指定なら5月〜10月が対象
 * @param userId ユーザーID
 * @param months 対象期間（月数、デフォルト: 6）
 * @returns 紹介実績
 */
export async function getReferralStats(
  userId: string,
  months: number = 6
): Promise<{
  memberReferrals: number
  fpReferrals: number
}> {
  // 基準月を計算（現在月の1ヶ月前）
  const now = new Date()
  const baseMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  // 対象期間の開始日を計算（基準月を含む過去N月分の最初の日）
  const startDate = new Date(baseMonth.getFullYear(), baseMonth.getMonth() - (months - 1), 1)

  // 対象期間の終了日を計算（基準月の最終日）
  const endDate = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 0, 23, 59, 59, 999)

  const [memberReferrals, fpReferrals] = await Promise.all([
    prisma.referral.count({
      where: {
        referrerId: userId,
        referralType: 'MEMBER',
        status: ReferralStatus.APPROVED,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    }),
    prisma.referral.count({
      where: {
        referrerId: userId,
        referralType: 'FP',
        status: ReferralStatus.APPROVED,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })
  ])

  return {
    memberReferrals,
    fpReferrals
  }
}

/**
 * 契約実績を取得
 * @param userId ユーザーID
 * @returns 契約実績（直20被保達成かどうか）
 */
export async function getContractAchievement(userId: string): Promise<boolean> {
  // 直20被保 = 直近20件の保険契約が達成されているか
  const contracts = await prisma.contract.findMany({
    where: {
      userId,
      contractType: 'INSURANCE',
      status: ContractStatus.ACTIVE
    },
    orderBy: {
      signedAt: 'desc'
    },
    take: 20
  })

  return contracts.length >= 20
}

