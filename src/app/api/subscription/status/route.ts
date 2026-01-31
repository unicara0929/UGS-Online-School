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
 * - subscription.status === 'ACTIVE' の場合もアクセス可能
 * - PAST_DUE, UNPAID, CANCELEDはアクセス不可（決済が必要）
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

    // アクティブなサブスクリプションの判定
    // 1. membershipStatus === 'ACTIVE' の場合: 管理者による直接作成ユーザー等 → true
    // 2. subscription.status === 'ACTIVE' の場合: 正規の決済済みユーザー → true
    //    ※ CANCELLATION_PENDING + subscription ACTIVE のユーザーもここで通る（退会申請中でも月額費決済済みならダッシュボード利用OK）
    // 3. それ以外: 未決済/支払い遅延等 → false
    //    ※ CANCELLATION_PENDING + subscription 非ACTIVE の場合は月額費支払いページへ誘導される
    const hasActiveSubscription =
      user?.membershipStatus === 'ACTIVE' ||
      subscription?.status === 'ACTIVE'

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
