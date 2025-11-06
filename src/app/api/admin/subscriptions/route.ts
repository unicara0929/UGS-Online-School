import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function GET(request: NextRequest) {
  try {
    // 必須環境変数が無い場合は空配列を返す（UIを壊さないためのフェイルセーフ）
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ subscriptions: [] })
    }

    // Prismaからサブスクリプション情報を取得
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      }
    })

    // Stripeから詳細なサブスクリプション情報を取得
    const subscriptionDetails = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          if (sub.stripeSubscriptionId) {
            // Stripe.Subscription型のプロパティにアクセス
            // TypeScriptの型定義が不完全なため、any型を使用して型チェックを回避
            const stripeSubscription: any = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId) as any
            return {
              ...sub,
              stripeDetails: {
                status: stripeSubscription.status,
                currentPeriodEnd: new Date((stripeSubscription.current_period_end || 0) * 1000),
                currentPeriodStart: new Date((stripeSubscription.current_period_start || 0) * 1000),
                cancelAtPeriodEnd: !!stripeSubscription.cancel_at_period_end,
                canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
                amount: stripeSubscription.items.data[0]?.price?.unit_amount || 0,
                currency: stripeSubscription.items.data[0]?.price?.currency || 'jpy',
              }
            }
          }
          return {
            ...sub,
            stripeDetails: null
          }
        } catch (error) {
          console.error(`Error fetching Stripe subscription ${sub.stripeSubscriptionId}:`, error)
          return {
            ...sub,
            stripeDetails: null
          }
        }
      })
    )

    return NextResponse.json({ subscriptions: subscriptionDetails })
  } catch (error) {
    console.error('API error:', error)
    // Prisma接続などで失敗した場合でも空を返しUIを維持
    return NextResponse.json({ subscriptions: [] })
  }
}
