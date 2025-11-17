import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

/**
 * 再有効化API
 * 退会済み（CANCELED）ユーザーが再度サブスクリプションを開始する
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        subscriptions: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // バリデーション: 退会済みユーザーのみ再有効化可能
    if (user.membershipStatus !== 'CANCELED') {
      return NextResponse.json(
        { error: '退会済みユーザーのみ再有効化が可能です' },
        { status: 400 }
      )
    }

    const subscription = user.subscriptions?.[0]

    // Stripeで新しいチェックアウトセッションを作成
    // 既存の顧客情報がある場合はそれを使用
    try {
      const priceId = process.env.STRIPE_PRICE_ID
      if (!priceId) {
        throw new Error('Stripe価格IDが設定されていません')
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: subscription?.stripeCustomerId || undefined,
        customer_email: subscription?.stripeCustomerId ? undefined : user.email,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?reactivated=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription`,
        metadata: {
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          isReactivation: 'true',
        },
      })

      return NextResponse.json({
        success: true,
        checkoutUrl: checkoutSession.url,
      })
    } catch (stripeError) {
      console.error('Stripe checkout session creation error:', stripeError)
      return NextResponse.json(
        { error: 'チェックアウトセッションの作成に失敗しました' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Reactivation API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
