import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { calculateAverageCompensation, getReferralStats, getContractAchievement } from '@/lib/services/compensation-calculator'

/**
 * 昇格条件のチェック結果
 */
export interface PromotionEligibility {
  isEligible: boolean
  conditions: {
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
 * 根本的な解決: エラーハンドリングを追加して、データベース接続エラーを適切に処理
 */
export async function checkFPPromotionEligibility(userId: string): Promise<PromotionEligibility> {
  try {
    const application = await prisma.fPPromotionApplication.findUnique({
      where: { userId }
    })

    // 知識テストは廃止、LP面談とアンケートのみ確認
    // コンプライアンステストはFPエイド昇格後にダッシュボードで実施
    const conditions = {
      lpMeetingCompleted: application?.lpMeetingCompleted || false,
      surveyCompleted: application?.surveyCompleted || false
    }

    const isEligible = conditions.lpMeetingCompleted &&
                      conditions.surveyCompleted

    return {
      isEligible,
      conditions
    }
  } catch (error: any) {
    console.error('Error checking FP promotion eligibility:', error)
    console.error('Error details:', {
      errorName: error.constructor?.name,
      errorCode: error.code,
      errorMessage: error.message,
      userId
    })
    
    // データベース接続エラーの場合は、デフォルト値を返す
    if (error.constructor?.name === 'PrismaClientInitializationError' || 
        error.message?.includes('Can\'t reach database server') ||
        error.message?.includes('database server') ||
        error.message?.includes('Tenant or user not found') ||
        error.message?.includes('FATAL') ||
        error.code === 'P1001' ||
        error.code === 'P1017') {
      throw new Error('データベースに接続できません。接続設定を確認してください。')
    }
    
    throw error
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

  // 報酬実績（直近6ヶ月平均70,000円以上）
  // 基準月（現在月の1ヶ月前）を含む過去6ヶ月間が対象
  const compensationAverage = await calculateAverageCompensation(userId, 6)
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

