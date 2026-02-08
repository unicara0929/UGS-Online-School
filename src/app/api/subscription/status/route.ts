import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, Roles } from '@/lib/auth/api-helpers'

/**
 * サブスクリプションステータスチェックAPI（軽量版）
 * GET /api/subscription/status
 * 権限: 認証済みユーザー
 *
 * PaymentGuardなどで頻繁に呼ばれるため、DBのみで判定し高速化
 *
 * セキュリティポリシー:
 * - 管理者は常にアクセス可能
 * - PENDING/EXPIRED かつ subscriptionレコードなし → 初回決済ページへ誘導
 * - それ以外（ACTIVE, CANCELLATION_PENDING, PAST_DUE等）→ ダッシュボードへ
 *   ※ PAST_DUE, CANCELED等はダッシュボード側のSubscriptionGuardで処理
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者は常にアクセス可能
    if (authUser!.role === Roles.ADMIN) {
      return NextResponse.json({
        success: true,
        hasActiveSubscription: true,
        isAdmin: true,
        subscriptionStatus: 'ADMIN'
      })
    }

    // ユーザー情報とサブスクリプションをDBから取得
    const user = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: {
        membershipStatus: true,
      },
    })

    const subscription = await prisma.subscription.findFirst({
      where: { userId: authUser!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
      },
    })

    // 初回決済ページへ誘導する条件:
    // membershipStatus が PENDING（仮登録）または EXPIRED（期限切れ）で、
    // かつサブスクリプションレコードが存在しない場合のみ
    // それ以外のステータス（ACTIVE, CANCELLATION_PENDING, PAST_DUE等）は
    // 初回決済済みとみなし、ダッシュボード側の SubscriptionGuard で処理する
    const needsInitialPayment =
      (user?.membershipStatus === 'PENDING' || user?.membershipStatus === 'EXPIRED') &&
      subscription === null

    const hasActiveSubscription = !needsInitialPayment

    return NextResponse.json({
      success: true,
      hasActiveSubscription,
      isAdmin: false,
      subscriptionStatus: subscription?.status || (user?.membershipStatus === 'ACTIVE' ? 'MEMBER_ACTIVE' : 'NONE')
    })
  } catch (error) {
    console.error('Subscription status check error:', error)
    return NextResponse.json(
      { error: 'サブスクリプションステータスの確認に失敗しました' },
      { status: 500 }
    )
  }
}
