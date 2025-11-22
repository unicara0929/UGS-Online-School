import { NextRequest, NextResponse } from 'next/server'
import { MembershipStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * ロール別統計API
 * UGS会員数、FPエイド数、昇格人数などを返す
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック（MANAGER以上）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.MANAGER_AND_ABOVE)
    if (roleError) return roleError

    // 有効な会員ステータス（退会・無効ユーザーを除外）
    const activeStatuses: MembershipStatus[] = ['ACTIVE', 'PENDING', 'PAST_DUE']

    // 1. UGS会員数（有効）
    const memberCount = await prisma.user.count({
      where: {
        role: 'MEMBER',
        membershipStatus: { in: activeStatuses }
      }
    })

    // 2. FPエイド数（有効）
    const fpCount = await prisma.user.count({
      where: {
        role: 'FP',
        membershipStatus: { in: activeStatuses }
      }
    })

    // 3. マネージャー数（参考値）
    const managerCount = await prisma.user.count({
      where: {
        role: 'MANAGER',
        membershipStatus: { in: activeStatuses }
      }
    })

    // 4. UGS会員→FPエイド昇格人数（累計）
    // FPPromotionApplicationのCOMPLETEDを使用（FP昇格申請経由の昇格）
    const promotionCount = await prisma.fPPromotionApplication.count({
      where: {
        status: 'COMPLETED'
      }
    })

    // 5. ロール変更履歴からの昇格人数（MEMBER→FP）- 新しい履歴テーブル
    const roleChangeCount = await prisma.roleChangeHistory.count({
      where: {
        fromRole: 'MEMBER',
        toRole: 'FP'
      }
    })

    // 昇格人数は両方の合計（重複を考慮、実際にはFPPromotionApplication経由が主）
    // 新しい履歴テーブルは今後の追跡用
    const totalPromotions = promotionCount + roleChangeCount

    // 6. 月別昇格推移（過去12ヶ月）
    const monthlyPromotions = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      // FPPromotionApplicationのcompletedAtで集計
      const count = await prisma.fPPromotionApplication.count({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: monthStart,
            lt: monthEnd
          }
        }
      })

      // RoleChangeHistoryからも集計
      const roleChangeMonthCount = await prisma.roleChangeHistory.count({
        where: {
          fromRole: 'MEMBER',
          toRole: 'FP',
          createdAt: {
            gte: monthStart,
            lt: monthEnd
          }
        }
      })

      monthlyPromotions.push({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
        year: monthStart.getFullYear(),
        monthNumber: monthStart.getMonth() + 1,
        promotions: count + roleChangeMonthCount
      })
    }

    // 7. 今月と前月の昇格数
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

    const thisMonthPromotions = await prisma.fPPromotionApplication.count({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: thisMonthStart }
      }
    })

    const lastMonthPromotions = await prisma.fPPromotionApplication.count({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: lastMonthStart,
          lt: lastMonthEnd
        }
      }
    })

    // レスポンス
    return NextResponse.json({
      overview: {
        memberCount,      // UGS会員数
        fpCount,          // FPエイド数
        managerCount,     // マネージャー数
        totalPromotions,  // 累計昇格人数
        thisMonthPromotions,
        lastMonthPromotions
      },
      monthlyPromotions,
      // 追加の統計情報
      details: {
        promotionViaApplication: promotionCount, // 昇格申請経由
        promotionViaRoleChange: roleChangeCount  // ロール変更履歴経由
      }
    })
  } catch (error) {
    console.error('Role stats API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
