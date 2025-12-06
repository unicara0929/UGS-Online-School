import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * カード情報更新用のStripe Customer Portalセッションを作成
 * POST /api/user/subscription/update-payment-method
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

    if (!subscription || !subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: 'サブスクリプションが見つかりません' },
        { status: 404 }
      )
    }

    // Stripe Customer Portalセッションを作成（デフォルト設定を使用）
    // 注意: Stripeダッシュボードで Customer Portal を事前に設定する必要があります
    // https://dashboard.stripe.com/settings/billing/portal
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription`,
    })

    return NextResponse.json({
      success: true,
      url: session.url
    })
  } catch (error: any) {
    console.error('Create portal session error:', error)

    // より詳細なエラーメッセージ
    let errorMessage = 'カード情報更新ページの作成に失敗しました'
    if (error.code === 'resource_missing') {
      errorMessage = 'Stripeの設定が必要です。管理者にお問い合わせください。'
    } else if (error.message) {
      console.error('Stripe error details:', error.message)
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

