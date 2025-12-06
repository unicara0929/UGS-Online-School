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

    // カード更新専用のBilling Portal Configurationを作成
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'お支払い方法の更新',
      },
      features: {
        payment_method_update: {
          enabled: true,
        },
        // 以下の機能を全て無効化
        subscription_cancel: {
          enabled: false,
        },
        subscription_update: {
          enabled: false,
        },
        invoice_history: {
          enabled: false,
        },
        customer_update: {
          enabled: false,
          allowed_updates: [],
        },
      },
    })

    // Stripe Customer Portalセッションを作成（支払い方法更新のみに制限）
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription`,
      configuration: configuration.id,
      flow_data: {
        type: 'payment_method_update',
      },
    })

    return NextResponse.json({
      success: true,
      url: session.url
    })
  } catch (error: any) {
    console.error('Create portal session error:', error)
    return NextResponse.json(
      { error: 'カード情報更新ページの作成に失敗しました' },
      { status: 500 }
    )
  }
}

