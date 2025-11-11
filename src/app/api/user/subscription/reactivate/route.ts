import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * サブスクリプションを再開
 * POST /api/user/subscription/reactivate
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

    // Stripeでサブスクリプションを再開
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    })

    // Prismaの状態も更新
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE' }
    })

    return NextResponse.json({
      success: true,
      message: 'サブスクリプションが再開されました'
    })
  } catch (error: any) {
    console.error('Reactivate subscription error:', error)
    return NextResponse.json(
      { error: 'サブスクリプションの再開に失敗しました' },
      { status: 500 }
    )
  }
}

