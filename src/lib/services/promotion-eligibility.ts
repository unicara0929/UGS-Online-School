import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { calculateAverageCompensation, getReferralStats, getContractAchievement } from '@/lib/services/compensation-calculator'

/**
 * 昇格条件のチェック結果
 */
export interface PromotionEligibility {
  isEligible: boolean
  conditions: {
    testPassed?: boolean
    lpMeetingCompleted?: boolean
    surveyCompleted?: boolean
    compensationAverage?: {
      current: number
      target: number
      met: boolean
    }
    memberReferrals?: {
      current: number
      target: number
      met: boolean
    }
    fpReferrals?: {
      current: number
      target: number
      met: boolean
    }
    contractAchieved?: boolean
  }
}

/**
 * FP昇格の条件をチェック
 */
export async function checkFPPromotionEligibility(userId: string): Promise<PromotionEligibility> {
  const application = await prisma.fPPromotionApplication.findUnique({
    where: { userId }
  })

  const conditions = {
    testPassed: application?.basicTestCompleted || false,
    lpMeetingCompleted: application?.lpMeetingCompleted || false,
    surveyCompleted: application?.surveyCompleted || false
  }

  const isEligible = conditions.testPassed && 
                    conditions.lpMeetingCompleted && 
                    conditions.surveyCompleted

  return {
    isEligible,
    conditions
  }
}

/**
 * マネージャー昇格の条件をチェック
 */
export async function checkManagerPromotionEligibility(userId: string): Promise<PromotionEligibility> {
  // ユーザーの現在のロールを確認（FPエイドである必要がある）
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user || user.role !== UserRole.FP) {
    return {
      isEligible: false,
      conditions: {}
    }
  }

  // 報酬実績（直近3ヶ月平均70,000円以上）
  const compensationAverage = await calculateAverageCompensation(userId, 3)
  const compensationTarget = 70000
  const compensationMet = compensationAverage >= compensationTarget

  // 紹介実績（6ヶ月間）
  const referralStats = await getReferralStats(userId, 6)
  const memberReferralTarget = 8
  const fpReferralTarget = 4
  const memberReferralMet = referralStats.memberReferrals >= memberReferralTarget
  const fpReferralMet = referralStats.fpReferrals >= fpReferralTarget

  // 契約実績（直20被保達成）
  const contractAchieved = await getContractAchievement(userId)

  const conditions = {
    compensationAverage: {
      current: compensationAverage,
      target: compensationTarget,
      met: compensationMet
    },
    memberReferrals: {
      current: referralStats.memberReferrals,
      target: memberReferralTarget,
      met: memberReferralMet
    },
    fpReferrals: {
      current: referralStats.fpReferrals,
      target: fpReferralTarget,
      met: fpReferralMet
    },
    contractAchieved
  }

  const isEligible = compensationMet && 
                    memberReferralMet && 
                    fpReferralMet && 
                    contractAchieved

  return {
    isEligible,
    conditions
  }
}

/**
 * 昇格可能性をチェック
 * @param userId ユーザーID
 * @param targetRole 目標ロール
 */
export async function checkPromotionEligibility(
  userId: string,
  targetRole: UserRole
): Promise<PromotionEligibility> {
  if (targetRole === UserRole.FP) {
    return checkFPPromotionEligibility(userId)
  } else if (targetRole === UserRole.MANAGER) {
    return checkManagerPromotionEligibility(userId)
  }

  return {
    isEligible: false,
    conditions: {}
  }
}

