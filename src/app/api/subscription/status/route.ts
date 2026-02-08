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
 * - membershipStatus === 'ACTIVE' の場合もアクセス可能（管理者による直接作成ユーザー等）
 * - subscriptionレコードが存在する場合もアクセス可能（初回決済済み）
 *   ※ PAST_DUE, CANCELED等はダッシュボード側のSubscriptionGuardで処理
 * - subscriptionレコードが存在しない場合のみ初回決済ページへ誘導
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

    // サブスクリプション判定（初回決済済みかどうか）
    // 1. membershipStatus === 'ACTIVE' の場合: 管理者による直接作成ユーザー等 → true
    // 2. subscription レコードが存在する場合: 初回決済済み → true
    //    ※ PAST_DUE, CANCELED 等の状態はダッシュボード側の SubscriptionGuard が
    //      適切な画面（カード更新画面、退会済み画面等）を表示する
    //    ※ サブスクリプションが存在しない場合のみ初回決済ページ（/complete-payment）へ誘導
    const hasActiveSubscription =
      user?.membershipStatus === 'ACTIVE' ||
      subscription !== null

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
