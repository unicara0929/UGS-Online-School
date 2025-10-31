import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

// 既存の価格IDを使用する場合の代替実装
export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // 既存の価格IDを使用（Stripe Dashboardで確認した価格IDを設定）
    const PRICE_ID = 'price_1SKdiLGMwXnba3WruwuiZjzK' // 実際の価格IDに置き換え

    // Checkout Sessionを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_ID, // 既存の価格IDを直接使用
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: email,
      metadata: {
        userName: name,
        userEmail: email,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`,
      subscription_data: {
        metadata: {
          userName: name,
          userEmail: email,
        },
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
