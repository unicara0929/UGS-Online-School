import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * サブスクリプションをキャンセル
 * POST /api/user/subscription/cancel
 * 権限: 認証済みユーザー、自分のデータのみ
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // ユーザーのサブスクリプションを取得
    const subscription = await prisma.subscription.findFirst({
      where: { userId: authUser!.id },
      orderBy: { createdAt: 'desc' }
    })

    if (!subscription || !subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'サブスクリプションが見つかりません' },
        { status: 404 }
      )
    }

    // Stripeでサブスクリプションをキャンセル（期間終了時にキャンセル）
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    })

    return NextResponse.json({
      success: true,
      message: 'サブスクリプションは現在の期間終了時にキャンセルされます'
    })
  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: 'サブスクリプションのキャンセルに失敗しました' },
      { status: 500 }
    )
  }
}

