import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import Stripe from 'stripe'

/**
 * ユーザーのサブスクリプション情報を取得
 * GET /api/user/subscription
 * 権限: 認証済みユーザー、自分のデータのみ
 */
export async function GET(request: NextRequest) {
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
      return NextResponse.json({
        success: true,
        subscription: null
      })
    }

    // Stripeから詳細情報を取得
    try {
      const stripeSubscription: any = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      ) as any

      // カード情報を取得
      const customerId = subscription.stripeCustomerId || stripeSubscription.customer
      let paymentMethod = null
      if (customerId && typeof customerId === 'string') {
        try {
          const customer: any = await stripe.customers.retrieve(customerId) as any
          if (customer.invoice_settings?.default_payment_method) {
            const pmId = typeof customer.invoice_settings.default_payment_method === 'string'
              ? customer.invoice_settings.default_payment_method
              : customer.invoice_settings.default_payment_method.id
            const pm: any = await stripe.paymentMethods.retrieve(pmId) as any
            paymentMethod = {
              brand: pm.card?.brand || 'unknown',
              last4: pm.card?.last4 || '****',
              expMonth: pm.card?.exp_month || null,
              expYear: pm.card?.exp_year || null
            }
          }
        } catch (pmError) {
          console.error('Failed to retrieve payment method:', pmError)
        }
      }

      return NextResponse.json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          stripeCustomerId: subscription.stripeCustomerId,
          currentPeriodEnd: subscription.currentPeriodEnd,
          stripeDetails: {
            status: stripeSubscription.status,
            currentPeriodEnd: new Date((stripeSubscription.current_period_end || 0) * 1000),
            currentPeriodStart: new Date((stripeSubscription.current_period_start || 0) * 1000),
            cancelAtPeriodEnd: !!stripeSubscription.cancel_at_period_end,
            canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
            amount: stripeSubscription.items.data[0]?.price?.unit_amount || 0,
            currency: stripeSubscription.items.data[0]?.price?.currency || 'jpy',
          },
          paymentMethod
        }
      })
    } catch (stripeError) {
      console.error('Error fetching Stripe subscription:', stripeError)
      return NextResponse.json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          stripeCustomerId: subscription.stripeCustomerId,
          currentPeriodEnd: subscription.currentPeriodEnd,
          stripeDetails: null,
          paymentMethod: null
        }
      })
    }
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'サブスクリプション情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

