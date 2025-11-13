/**
 * サブスクリプション関連のユーティリティ関数
 * サブスクリプションステータスの判定などで使用
 */

/**
 * サブスクリプションステータス情報
 */
export interface SubscriptionStatusInfo {
  status: 'none' | 'active' | 'canceled' | 'past_due' | 'unpaid' | 'pending' | 'unknown'
  label: string
  variant: 'default' | 'destructive' | 'secondary' | 'outline'
  cancelAtPeriodEnd?: boolean
}

/**
 * ユーザーのサブスクリプションステータスを取得
 */
export function getSubscriptionStatus(
  userId: string,
  subscriptions: Array<{
    userId: string
    stripeDetails?: {
      status: string
      cancelAtPeriodEnd?: boolean
    } | null
  }>
): SubscriptionStatusInfo {
  const subscription = subscriptions.find(sub => sub.userId === userId)
  
  if (!subscription) {
    return { status: 'none', label: '未決済', variant: 'outline' }
  }

  if (subscription.stripeDetails) {
    const stripeStatus = subscription.stripeDetails.status
    switch (stripeStatus) {
      case 'active':
        return {
          status: 'active',
          label: 'アクティブ',
          variant: 'default',
          cancelAtPeriodEnd: subscription.stripeDetails.cancelAtPeriodEnd,
        }
      case 'canceled':
        return { status: 'canceled', label: 'キャンセル済み', variant: 'destructive' }
      case 'past_due':
        return { status: 'past_due', label: '支払い遅延', variant: 'destructive' }
      case 'unpaid':
        return { status: 'unpaid', label: '未払い', variant: 'destructive' }
      default:
        return { status: 'unknown', label: stripeStatus, variant: 'secondary' }
    }
  }

  return { status: 'pending', label: '処理中', variant: 'secondary' }
}

