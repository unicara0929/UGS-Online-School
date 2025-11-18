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
 * - status === 'ACTIVE' のみをアクティブとする
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

    // ユーザーのサブスクリプションをDBから取得
    const subscription = await prisma.subscription.findFirst({
      where: { userId: authUser!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
      },
    })

    // アクティブなサブスクリプションの判定（厳格化）
    // - subscription レコードが存在しない: 初回未決済 → false
    // - status === 'ACTIVE': アクティブ → true
    // - status === 'PAST_DUE': 支払い遅延 → false（要支払い）
    // - status === 'UNPAID': 未払い → false（要支払い）
    // - status === 'CANCELED': 解約済み → false（再契約が必要）
    const hasActiveSubscription = subscription?.status === 'ACTIVE'

    return NextResponse.json({
      success: true,
      hasActiveSubscription,
      isAdmin: false,
      subscriptionStatus: subscription?.status || 'NONE'
    })
  } catch (error) {
    console.error('Subscription status check error:', error)
    return NextResponse.json(
      { error: 'サブスクリプションステータスの確認に失敗しました' },
      { status: 500 }
    )
  }
}
