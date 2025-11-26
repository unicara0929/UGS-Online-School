import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

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

    // Stripeから詳細情報を取得（discountsを展開）
    try {
      const stripeSubscription: any = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId,
        {
          expand: ['discounts', 'discounts.coupon']
        }
      ) as any

      // カード情報を取得
      const customerId = subscription.stripeCustomerId || stripeSubscription.customer
      let paymentMethod = null

      // 1. まずサブスクリプションの default_payment_method を確認
      if (stripeSubscription.default_payment_method) {
        try {
          const pmId = typeof stripeSubscription.default_payment_method === 'string'
            ? stripeSubscription.default_payment_method
            : stripeSubscription.default_payment_method.id
          const pm: any = await stripe.paymentMethods.retrieve(pmId) as any
          paymentMethod = {
            brand: pm.card?.brand || 'unknown',
            last4: pm.card?.last4 || '****',
            expMonth: pm.card?.exp_month || null,
            expYear: pm.card?.exp_year || null
          }
        } catch (pmError) {
          console.error('Failed to retrieve subscription payment method:', pmError)
        }
      }

      // 2. なければ customer.invoice_settings.default_payment_method を確認
      if (!paymentMethod && customerId && typeof customerId === 'string') {
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
          console.error('Failed to retrieve customer payment method:', pmError)
        }
      }

      // 3. それでもなければ、顧客に紐付いた最新のカードを取得
      if (!paymentMethod && customerId && typeof customerId === 'string') {
        try {
          const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
            limit: 1
          })
          if (paymentMethods.data.length > 0) {
            const pm = paymentMethods.data[0]
            paymentMethod = {
              brand: pm.card?.brand || 'unknown',
              last4: pm.card?.last4 || '****',
              expMonth: pm.card?.exp_month || null,
              expYear: pm.card?.exp_year || null
            }
          }
        } catch (pmError) {
          console.error('Failed to list payment methods:', pmError)
        }
      }

      // 元の金額を取得
      const originalAmount = stripeSubscription.items.data[0]?.price?.unit_amount || 0

      // 割引情報を取得
      let discountPercentOff = 0
      let discountAmountOff = 0
      let discountName = null

      // discountsが配列の場合（新しいStripe API）
      if (stripeSubscription.discounts && Array.isArray(stripeSubscription.discounts) && stripeSubscription.discounts.length > 0) {
        const firstDiscountItem = stripeSubscription.discounts[0]

        // source.coupon からクーポンIDを取得して、クーポン詳細を取得
        if (firstDiscountItem?.source?.coupon) {
          const couponId = firstDiscountItem.source.coupon
          try {
            const coupon = await stripe.coupons.retrieve(couponId)
            discountPercentOff = coupon.percent_off || 0
            discountAmountOff = coupon.amount_off || 0
            discountName = coupon.name || null
          } catch (couponError) {
            console.error('Failed to retrieve coupon:', couponError)
          }
        } else if (firstDiscountItem?.coupon) {
          // discountsの要素がオブジェクトの場合（展開済み、古い形式）
          const coupon = firstDiscountItem.coupon
          discountPercentOff = coupon.percent_off || 0
          discountAmountOff = coupon.amount_off || 0
          discountName = coupon.name || null
        }
      }

      // 単一のdiscountの場合（古いStripe API）
      if (discountPercentOff === 0 && discountAmountOff === 0 && stripeSubscription.discount?.coupon) {
        const coupon = stripeSubscription.discount.coupon
        discountPercentOff = coupon.percent_off || 0
        discountAmountOff = coupon.amount_off || 0
        discountName = coupon.name || null
      }

      // 割引後の金額を計算
      let actualAmount = originalAmount
      if (discountPercentOff > 0) {
        actualAmount = Math.round(originalAmount * (1 - discountPercentOff / 100))
      } else if (discountAmountOff > 0) {
        actualAmount = Math.max(0, originalAmount - discountAmountOff)
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
            amount: actualAmount,  // 割引適用後の金額
            originalAmount: originalAmount,  // 元の金額
            currency: stripeSubscription.items.data[0]?.price?.currency || 'jpy',
            discount: discountPercentOff > 0 || discountAmountOff > 0 ? {
              percentOff: discountPercentOff,
              amountOff: discountAmountOff,
              name: discountName,
            } : null,
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

