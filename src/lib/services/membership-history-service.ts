import { prisma } from '@/lib/prisma'
import { MembershipStatus } from '@prisma/client'

/**
 * 会員ステータス変更履歴を記録
 */
export async function recordMembershipStatusChange(params: {
  userId: string
  fromStatus: MembershipStatus
  toStatus: MembershipStatus
  reason?: string
  changedBy?: string // ユーザーIDまたは"SYSTEM"
  changedByName?: string
}) {
  const { userId, fromStatus, toStatus, reason, changedBy, changedByName } = params

  try {
    await prisma.membershipStatusHistory.create({
      data: {
        userId,
        fromStatus,
        toStatus,
        reason,
        changedBy,
        changedByName,
      }
    })

    console.log(`Membership status history recorded: ${userId} ${fromStatus} -> ${toStatus}`)
  } catch (error) {
    console.error('Failed to record membership status history:', error)
    // 履歴記録失敗でもステータス変更処理は続行
  }
}

/**
 * ユーザーのステータス変更履歴を取得
 */
export async function getMembershipStatusHistory(userId: string) {
  return await prisma.membershipStatusHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
}
