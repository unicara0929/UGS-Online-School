/**
 * Stripe Webhookイベントハンドラー
 * 各イベントタイプの処理を分離して可読性を向上
 */

import { stripe } from '@/lib/stripe'
import { sendPaymentConfirmationEmail, sendPaymentFailedEmail, sendSubscriptionCancelledEmail } from '@/lib/email'
import { sendEventConfirmationEmail } from '@/lib/services/email-service'
import { prisma } from '@/lib/prisma'
import { ReferralStatus } from '@prisma/client'
import Stripe from 'stripe'

/**
 * checkout.session.completed イベントの処理
 */
export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // イベント支払いの場合
  if (session.metadata?.type === 'event') {
    await handleEventPaymentCompleted(session)
    return
  }

  // サブスクリプション支払いの場合
  if (session.mode !== 'subscription') return

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
  const userEmail = session.customer_email || session.metadata?.userEmail

  // 会員ステータスを PENDING → ACTIVE に更新
  if (userEmail) {
    try {
      await prisma.user.update({
        where: { email: userEmail },
        data: {
          membershipStatus: 'ACTIVE',
          membershipStatusChangedAt: new Date(),
          membershipStatusReason: '決済完了により有効会員に移行'
        }
      })
      console.log('Membership status updated to ACTIVE for:', userEmail)
    } catch (error) {
      console.error('Failed to update membership status:', error)
    }
  }

  // 決済完了メールを送信
  await sendPaymentConfirmationEmail({
    to: userEmail || '',
    userName: session.metadata?.userName || '',
    amount: session.amount_total || 0,
    subscriptionId: subscription.id,
    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login?email=${encodeURIComponent(userEmail || '')}`,
  })

  console.log('Payment confirmation email sent for subscription:', subscription.id)

  // 紹介コードが含まれている場合、紹介を自動登録
  await handleReferralRegistration(session)
}

/**
 * イベント支払い完了の処理
 */
async function handleEventPaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { eventId, userId, registrationId } = session.metadata || {}

  if (!registrationId) {
    console.error('Missing registrationId in event payment session metadata')
    return
  }

  try {
    // EventRegistrationを更新: PENDING → PAID
    const registration = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        paymentStatus: 'PAID',
        stripePaymentIntentId: session.payment_intent as string,
        paidAmount: session.amount_total || 0,
        paidAt: new Date(),
      },
      include: {
        event: true,
        user: true,
      }
    })

    console.log(`Event payment completed: eventId=${eventId}, userId=${userId}, registrationId=${registrationId}`)

    // イベント参加確定メールを送信
    try {
      await sendEventConfirmationEmail({
        to: registration.user.email,
        userName: registration.user.name,
        eventTitle: registration.event.title,
        eventDate: registration.event.date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        }),
        eventTime: registration.event.time || undefined,
        eventLocation: registration.event.location || undefined,
        venueType: registration.event.venueType,
        eventId: registration.event.id,
      })
      console.log('Event confirmation email sent to:', registration.user.email)
    } catch (emailError) {
      console.error('Failed to send event confirmation email:', emailError)
      // メール送信失敗でも処理は続行
    }
  } catch (error) {
    console.error('Failed to update event registration payment status:', error)
  }
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
      select: { id: true, role: true }
    })

    if (!referrer) return

    // 被紹介者を取得
    const referred = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, role: true }
    })

    if (!referred || referrer.id === referred.id) return

    // 紹介タイプを決定（紹介者のロールに基づく）
    // FP が紹介した場合は FP_REFERRAL、それ以外は MEMBER_REFERRAL
    const referralType = referrer.role === 'FP' ? 'FP' : 'MEMBER'

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

    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subId },
      include: { user: true }
    })

    if (subscription) {
      // サブスクリプションステータスを更新
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subId },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null
        }
      })

      // 会員ステータスを ACTIVE に更新（PAST_DUE から復帰）
      await prisma.user.update({
        where: { id: subscription.userId },
        data: {
          membershipStatus: 'ACTIVE',
          membershipStatusChangedAt: new Date(),
          membershipStatusReason: '決済成功により正常状態に復帰',
          delinquentSince: null // 滞納フラグをクリア
        }
      })
      console.log('Membership status updated to ACTIVE for user:', subscription.userId)
    }
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

  // サブスクリプションステータスを更新
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: {
      status: 'PAST_DUE'
    }
  })

  // 会員ステータスを PAST_DUE に更新
  await prisma.user.update({
    where: { id: subscription.userId },
    data: {
      membershipStatus: 'PAST_DUE',
      membershipStatusChangedAt: new Date(),
      membershipStatusReason: '決済失敗により支払い遅延状態に移行',
      delinquentSince: new Date() // 滞納開始日を記録
    }
  })
  console.log('Membership status updated to PAST_DUE for user:', subscription.userId)

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

  // サブスクリプションステータスを更新
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'CANCELED'
    }
  })

  // 会員ステータスを CANCELED に更新
  await prisma.user.update({
    where: { id: subscriptionRecord.userId },
    data: {
      membershipStatus: 'CANCELED',
      membershipStatusChangedAt: new Date(),
      membershipStatusReason: 'サブスクリプションキャンセルにより退会',
      canceledAt: new Date()
    }
  })
  console.log('Membership status updated to CANCELED for user:', subscriptionRecord.userId)

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
