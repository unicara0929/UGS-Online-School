import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * サブスクリプションステータスチェックAPI（軽量版）
 * GET /api/subscription/status
 * 権限: 認証済みユーザー
 *
 * PaymentGuardなどで頻繁に呼ばれるため、DBのみで判定し高速化
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // ユーザーのサブスクリプションをDBから取得
    const subscription = await prisma.subscription.findFirst({
      where: { userId: authUser!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
      },
    })

    // アクティブなサブスクリプションの判定
    // subscription レコードが存在しない場合のみ false（初回未決済）
    // 既存会員（PAST_DUE, UNPAID）や解約済み（CANCELED）の場合は true
    // → /complete-payment 画面は初回未決済者のみに表示
    const hasActiveSubscription = subscription !== null

    return NextResponse.json({
      success: true,
      hasActiveSubscription,
    })
  } catch (error) {
    console.error('Subscription status check error:', error)
    return NextResponse.json(
      { error: 'サブスクリプションステータスの確認に失敗しました' },
      { status: 500 }
    )
  }
}
