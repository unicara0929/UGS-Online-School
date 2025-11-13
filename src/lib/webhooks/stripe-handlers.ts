/**
 * Stripe Webhookイベントハンドラー
 * 各イベントタイプの処理を分離して可読性を向上
 */

import { stripe } from '@/lib/stripe'
import { sendPaymentConfirmationEmail, sendPaymentFailedEmail, sendSubscriptionCancelledEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { ReferralStatus } from '@prisma/client'
import Stripe from 'stripe'

/**
 * checkout.session.completed イベントの処理
 */
export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'subscription') return

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

  // 決済完了メールを送信
  await sendPaymentConfirmationEmail({
    to: session.customer_email || session.metadata?.userEmail || '',
    userName: session.metadata?.userName || '',
    amount: session.amount_total || 0,
    subscriptionId: subscription.id,
    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login?email=${encodeURIComponent(session.customer_email || '')}`,
  })

  console.log('Payment confirmation email sent for subscription:', subscription.id)

  // 紹介コードが含まれている場合、紹介を自動登録
  await handleReferralRegistration(session)
}

/**
 * 紹介登録の処理
 */
async function handleReferralRegistration(session: Stripe.Checkout.Session): Promise<void> {
  const referralCode = session.metadata?.referralCode
  const userEmail = session.customer_email || session.metadata?.userEmail

  if (!referralCode || !userEmail) return

  try {
    // 紹介コードから紹介者を取得
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true }
    })

    if (!referrer) return

    // 被紹介者を取得
    const referred = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, role: true }
    })

    if (!referred || referrer.id === referred.id) return

    // 紹介タイプを決定（被紹介者のロールに基づく）
    const referralType = referred.role === 'FP' ? 'FP' : 'MEMBER'

    // 既存の紹介をチェック
    const existingReferral = await prisma.referral.findUnique({
      where: {
        referrerId_referredId: {
          referrerId: referrer.id,
          referredId: referred.id
        }
      }
    })

    if (!existingReferral) {
      // 紹介を登録
      await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: referred.id,
          referralType: referralType as any,
          status: ReferralStatus.PENDING
        }
      })
      console.log('Referral registered from checkout:', { referrerId: referrer.id, referredId: referred.id })
    }
  } catch (error) {
    console.error('Failed to register referral from checkout:', error)
    // 紹介登録失敗でも決済処理は続行
  }
}

/**
 * invoice.payment_succeeded イベントの処理
 */
export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log('Monthly payment succeeded for invoice:', invoice.id)
  
  // サブスクリプションの状態を更新
  const subscriptionId = (invoice as any).subscription
  if (subscriptionId) {
    const subId = typeof subscriptionId === 'string' 
      ? subscriptionId 
      : subscriptionId.id

    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subId },
      data: {
        status: 'ACTIVE',
        currentPeriodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null
      }
    })
  }
}

/**
 * invoice.payment_failed イベントの処理
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log('Payment failed for invoice:', invoice.id)
  
  // サブスクリプションの状態を更新
  const subscriptionId = (invoice as any).subscription
  if (!subscriptionId) return

  const subId = typeof subscriptionId === 'string' 
    ? subscriptionId 
    : subscriptionId.id

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subId },
    include: { user: true }
  })

  if (!subscription) return

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: {
      status: 'PAST_DUE'
    }
  })

  // 決済失敗メールを送信
  try {
    const updateCardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription`
    await sendPaymentFailedEmail({
      to: subscription.user.email,
      userName: subscription.user.name,
      amount: invoice.amount_due || 0,
      invoiceId: invoice.id,
      updateCardUrl
    })
    console.log('Payment failed email sent to:', subscription.user.email)
  } catch (emailError) {
    console.error('Failed to send payment failed email:', emailError)
    // メール送信失敗でも処理は続行
  }
}

/**
 * customer.subscription.deleted イベントの処理
 */
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log('Subscription cancelled:', subscription.id)
  
  // サブスクリプションの状態を更新
  const subscriptionRecord = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: { user: true }
  })

  if (!subscriptionRecord) return

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'CANCELED'
    }
  })

  // キャンセルメールを送信
  try {
    const reactivateUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription`
    await sendSubscriptionCancelledEmail({
      to: subscriptionRecord.user.email,
      userName: subscriptionRecord.user.name,
      subscriptionId: subscription.id,
      reactivateUrl
    })
    console.log('Subscription cancelled email sent to:', subscriptionRecord.user.email)
  } catch (emailError) {
    console.error('Failed to send subscription cancelled email:', emailError)
    // メール送信失敗でも処理は続行
  }
}
