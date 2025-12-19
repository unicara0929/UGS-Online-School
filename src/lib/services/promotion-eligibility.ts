import { prisma } from '@/lib/prisma'
import { UserRole, MembershipStatus } from '@prisma/client'
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
 * MGR昇格条件のチェック結果（新仕様）
 */
export interface ManagerPromotionEligibility {
  isEligible: boolean
  conditions: {
    // ① 過去6ヶ月売上合計42万円以上
    salesTotal: {
      current: number
      target: number
      met: boolean
    }
    // ② 被保険者数累計20名以上
    insuredCount: {
      current: number
      target: number
      met: boolean
    }
    // ③ UGS会員8名以上紹介（6ヶ月以内、登録維持中）
    memberReferrals: {
      current: number
      target: number
      met: boolean
    }
    // ④ FPエイド4名以上輩出（6ヶ月以内、職位維持中）
    fpReferrals: {
      current: number
      target: number
      met: boolean
    }
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
 * マネージャー昇格の条件をチェック（新仕様）
 *
 * 昇格条件:
 * ① 過去6ヶ月売上合計42万円以上
 * ② 被保険者数累計20名以上
 * ③ UGS会員8名以上紹介（6ヶ月以内、登録維持中）
 * ④ FPエイド4名以上輩出（6ヶ月以内、職位維持中）
 */
export async function checkManagerPromotionEligibility(userId: string): Promise<ManagerPromotionEligibility> {
  // ユーザーの現在のロールを確認（FPエイドである必要がある）
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user || user.role !== UserRole.FP) {
    return {
      isEligible: false,
      conditions: {
        salesTotal: { current: 0, target: 420000, met: false },
        insuredCount: { current: 0, target: 20, met: false },
        memberReferrals: { current: 0, target: 8, met: false },
        fpReferrals: { current: 0, target: 4, met: false },
      }
    }
  }

  // 過去6ヶ月の期間を計算
  const now = new Date()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  // ① 過去6ヶ月売上合計（ManagerMonthlySalesテーブルから取得）
  const salesData = await getManagerSalesTotal(userId, 6)
  const salesTotalTarget = 420000
  const salesTotalMet = salesData.totalSales >= salesTotalTarget

  // ② 被保険者数累計（ManagerMonthlySalesテーブルから取得）
  const insuredCountTarget = 20
  const insuredCountMet = salesData.totalInsuredCount >= insuredCountTarget

  // ③ UGS会員紹介（6ヶ月以内、登録維持中）
  const memberReferrals = await getActiveReferrals(userId, 'MEMBER', sixMonthsAgo)
  const memberReferralTarget = 8
  const memberReferralMet = memberReferrals >= memberReferralTarget

  // ④ FPエイド輩出（6ヶ月以内、職位維持中）
  const fpReferrals = await getActiveReferrals(userId, 'FP', sixMonthsAgo)
  const fpReferralTarget = 4
  const fpReferralMet = fpReferrals >= fpReferralTarget

  const conditions = {
    salesTotal: {
      current: salesData.totalSales,
      target: salesTotalTarget,
      met: salesTotalMet
    },
    insuredCount: {
      current: salesData.totalInsuredCount,
      target: insuredCountTarget,
      met: insuredCountMet
    },
    memberReferrals: {
      current: memberReferrals,
      target: memberReferralTarget,
      met: memberReferralMet
    },
    fpReferrals: {
      current: fpReferrals,
      target: fpReferralTarget,
      met: fpReferralMet
    }
  }

  const isEligible = salesTotalMet &&
                    insuredCountMet &&
                    memberReferralMet &&
                    fpReferralMet

  return {
    isEligible,
    conditions
  }
}

/**
 * MGRの過去N ヶ月の売上・被保険者数合計を取得
 */
async function getManagerSalesTotal(userId: string, months: number): Promise<{
  totalSales: number
  totalInsuredCount: number
}> {
  const now = new Date()
  const monthStrings: string[] = []

  // 過去Nヶ月分のYYYY-MM形式文字列を生成
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthStrings.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const salesRecords = await prisma.managerMonthlySales.findMany({
    where: {
      userId,
      month: { in: monthStrings }
    },
    select: {
      salesAmount: true,
      insuredCount: true
    }
  })

  const totalSales = salesRecords.reduce((sum, r) => sum + r.salesAmount, 0)
  const totalInsuredCount = salesRecords.reduce((sum, r) => sum + r.insuredCount, 0)

  return { totalSales, totalInsuredCount }
}

/**
 * 有効な紹介数を取得（登録維持中/職位維持中のみカウント）
 */
async function getActiveReferrals(userId: string, type: 'MEMBER' | 'FP', since: Date): Promise<number> {
  // 紹介テーブルから該当ユーザーの紹介一覧を取得
  // APPROVED（承認済み）またはREWARDED（報酬支払い済み）をカウント
  const referrals = await prisma.referral.findMany({
    where: {
      referrerId: userId,
      referralType: type,
      createdAt: { gte: since },
      status: { in: ['APPROVED', 'REWARDED'] }
    },
    select: {
      referredId: true,
      referred: {
        select: {
          role: true,
          membershipStatus: true
        }
      }
    }
  })

  // 有効な紹介のみをカウント
  let count = 0
  for (const referral of referrals) {
    if (type === 'MEMBER') {
      // UGS会員: 会員ステータスがACTIVEであること
      if (referral.referred.membershipStatus === MembershipStatus.ACTIVE) {
        count++
      }
    } else if (type === 'FP') {
      // FPエイド: ロールがFP以上（FP, MANAGER, ADMIN）であること
      if (referral.referred.role === UserRole.FP ||
          referral.referred.role === UserRole.MANAGER ||
          referral.referred.role === UserRole.ADMIN) {
        count++
      }
    }
  }

  return count
}

/**
 * 昇格可能性をチェック
 * @param userId ユーザーID
 * @param targetRole 目標ロール
 */
export async function checkPromotionEligibility(
  userId: string,
  targetRole: UserRole
): Promise<PromotionEligibility | ManagerPromotionEligibility> {
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

/**
 * MGR再昇格条件のチェック結果
 * 降格後4ヶ月以内に条件達成で再昇格面接可
 */
export interface ManagerRePromotionEligibility {
  isEligible: boolean
  isWithinPeriod: boolean // 降格後4ヶ月以内か
  daysRemaining: number | null // 再昇格可能期間の残り日数
  conditions: {
    // 売上28万円以上
    salesTotal: {
      current: number
      target: number
      met: boolean
    }
    // 被保険者20名以上
    insuredCount: {
      current: number
      target: number
      met: boolean
    }
    // UGS会員5名以上紹介（登録維持）
    memberReferrals: {
      current: number
      target: number
      met: boolean
    }
    // FPエイド3名以上輩出（職位維持）
    fpReferrals: {
      current: number
      target: number
      met: boolean
    }
  }
}

/**
 * MGR再昇格条件をチェック
 * 降格後4ヶ月以内に以下を達成で再昇格面接可:
 * - 売上28万円以上
 * - 被保険者20名以上
 * - UGS会員5名以上紹介（登録維持）
 * - FPエイド3名以上輩出（職位維持）
 */
export async function checkManagerRePromotionEligibility(userId: string): Promise<ManagerRePromotionEligibility> {
  // ユーザー情報を取得
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      managerDemotedAt: true
    }
  })

  // FPエイドでなければ対象外
  if (!user || user.role !== UserRole.FP) {
    return {
      isEligible: false,
      isWithinPeriod: false,
      daysRemaining: null,
      conditions: {
        salesTotal: { current: 0, target: 280000, met: false },
        insuredCount: { current: 0, target: 20, met: false },
        memberReferrals: { current: 0, target: 5, met: false },
        fpReferrals: { current: 0, target: 3, met: false },
      }
    }
  }

  // MGR降格歴がなければ対象外（新規昇格条件を使用）
  if (!user.managerDemotedAt) {
    return {
      isEligible: false,
      isWithinPeriod: false,
      daysRemaining: null,
      conditions: {
        salesTotal: { current: 0, target: 280000, met: false },
        insuredCount: { current: 0, target: 20, met: false },
        memberReferrals: { current: 0, target: 5, met: false },
        fpReferrals: { current: 0, target: 3, met: false },
      }
    }
  }

  // 降格後4ヶ月以内かどうかをチェック
  const now = new Date()
  const demotedAt = new Date(user.managerDemotedAt)
  const fourMonthsAfterDemotion = new Date(demotedAt)
  fourMonthsAfterDemotion.setMonth(fourMonthsAfterDemotion.getMonth() + 4)

  const isWithinPeriod = now <= fourMonthsAfterDemotion
  const daysRemaining = isWithinPeriod
    ? Math.ceil((fourMonthsAfterDemotion.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // 期間外なら対象外
  if (!isWithinPeriod) {
    return {
      isEligible: false,
      isWithinPeriod: false,
      daysRemaining: 0,
      conditions: {
        salesTotal: { current: 0, target: 280000, met: false },
        insuredCount: { current: 0, target: 20, met: false },
        memberReferrals: { current: 0, target: 5, met: false },
        fpReferrals: { current: 0, target: 3, met: false },
      }
    }
  }

  // 降格後の売上・被保険者数を取得
  const salesData = await getManagerSalesTotalSinceDemotion(userId, demotedAt)
  const salesTotalTarget = 280000
  const salesTotalMet = salesData.totalSales >= salesTotalTarget

  const insuredCountTarget = 20
  const insuredCountMet = salesData.totalInsuredCount >= insuredCountTarget

  // 降格後のUGS会員紹介
  const memberReferrals = await getActiveReferrals(userId, 'MEMBER', demotedAt)
  const memberReferralTarget = 5
  const memberReferralMet = memberReferrals >= memberReferralTarget

  // 降格後のFPエイド輩出
  const fpReferrals = await getActiveReferrals(userId, 'FP', demotedAt)
  const fpReferralTarget = 3
  const fpReferralMet = fpReferrals >= fpReferralTarget

  const conditions = {
    salesTotal: {
      current: salesData.totalSales,
      target: salesTotalTarget,
      met: salesTotalMet
    },
    insuredCount: {
      current: salesData.totalInsuredCount,
      target: insuredCountTarget,
      met: insuredCountMet
    },
    memberReferrals: {
      current: memberReferrals,
      target: memberReferralTarget,
      met: memberReferralMet
    },
    fpReferrals: {
      current: fpReferrals,
      target: fpReferralTarget,
      met: fpReferralMet
    }
  }

  const isEligible = salesTotalMet &&
                    insuredCountMet &&
                    memberReferralMet &&
                    fpReferralMet

  return {
    isEligible,
    isWithinPeriod,
    daysRemaining,
    conditions
  }
}

/**
 * 降格後の売上・被保険者数合計を取得
 */
async function getManagerSalesTotalSinceDemotion(userId: string, demotedAt: Date): Promise<{
  totalSales: number
  totalInsuredCount: number
}> {
  // 降格月以降のデータを取得
  const demotedMonth = `${demotedAt.getFullYear()}-${String(demotedAt.getMonth() + 1).padStart(2, '0')}`

  const salesRecords = await prisma.managerMonthlySales.findMany({
    where: {
      userId,
      month: { gte: demotedMonth }
    },
    select: {
      salesAmount: true,
      insuredCount: true
    }
  })

  const totalSales = salesRecords.reduce((sum, r) => sum + r.salesAmount, 0)
  const totalInsuredCount = salesRecords.reduce((sum, r) => sum + r.insuredCount, 0)

  return { totalSales, totalInsuredCount }
}

