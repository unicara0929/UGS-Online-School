import { prisma } from '@/lib/prisma'
import { NotificationType, NotificationPriority } from '@prisma/client'

/**
 * 通知を作成
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  priority: NotificationPriority,
  title: string,
  message: string,
  actionUrl?: string
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      type,
      priority,
      title,
      message,
      actionUrl
    }
  })
}

/**
 * 報酬確定通知を作成
 */
export async function createCompensationReadyNotification(
  userId: string,
  month: string,
  amount: number
): Promise<void> {
  await createNotification(
    userId,
    NotificationType.COMPENSATION_READY,
    NotificationPriority.INFO,
    '報酬が確定しました',
    `${month}の報酬が確定しました。金額: ¥${amount.toLocaleString()}`,
    '/dashboard/compensation'
  )
}

/**
 * 昇格可能通知を作成
 */
export async function createPromotionEligibleNotification(
  userId: string,
  targetRole: string
): Promise<void> {
  await createNotification(
    userId,
    NotificationType.PROMOTION_ELIGIBLE,
    NotificationPriority.SUCCESS,
    '昇格条件を達成しました',
    `${targetRole}への昇格条件を達成しました。申請できます。`,
    '/dashboard/promotion'
  )
}

/**
 * 昇格承認通知を作成
 */
export async function createPromotionApprovedNotification(
  userId: string,
  targetRole: string
): Promise<void> {
  // FPエイド昇格の場合はオンボーディングページへ、それ以外はダッシュボードへ
  const actionUrl = targetRole === 'FPエイド'
    ? '/dashboard/fp-onboarding'
    : '/dashboard'

  await createNotification(
    userId,
    NotificationType.PROMOTION_APPROVED,
    NotificationPriority.SUCCESS,
    '昇格が承認されました',
    `${targetRole}への昇格が承認されました。おめでとうございます！`,
    actionUrl
  )
}

/**
 * イベントリマインダー通知を作成
 */
export async function createEventReminderNotification(
  userId: string,
  eventTitle: string,
  eventDate: Date,
  eventId: string
): Promise<void> {
  await createNotification(
    userId,
    NotificationType.EVENT_REMINDER,
    NotificationPriority.INFO,
    'イベントリマインダー',
    `${eventTitle}が${eventDate.toLocaleDateString('ja-JP')}に開催されます。`,
    `/dashboard/events/${eventId}`
  )
}

/**
 * 必須イベント通知を作成
 */
export async function createRequiredEventNotification(
  userId: string,
  eventTitle: string,
  eventDate: Date,
  eventId: string
): Promise<void> {
  await createNotification(
    userId,
    NotificationType.EVENT_REQUIRED,
    NotificationPriority.CRITICAL,
    '必須イベントの参加が必要です',
    `${eventTitle}は必須参加イベントです。${eventDate.toLocaleDateString('ja-JP')}までに登録してください。`,
    `/dashboard/events/${eventId}`
  )
}

/**
 * 紹介報酬通知を作成
 */
export async function createReferralRewardedNotification(
  userId: string,
  referralType: string,
  rewardAmount: number
): Promise<void> {
  await createNotification(
    userId,
    NotificationType.REFERRAL_REWARDED,
    NotificationPriority.SUCCESS,
    '紹介報酬が確定しました',
    `${referralType}紹介報酬が確定しました。金額: ¥${rewardAmount.toLocaleString()}`,
    '/dashboard/referrals'
  )
}

