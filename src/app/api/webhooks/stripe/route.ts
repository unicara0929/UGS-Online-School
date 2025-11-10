import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { sendPaymentConfirmationEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { ReferralStatus } from '@prisma/client'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription') {
          // サブスクリプション決済完了時の処理
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

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
          const referralCode = session.metadata?.referralCode
          const userEmail = session.customer_email || session.metadata?.userEmail
          
          if (referralCode && userEmail) {
            try {
              // 紹介コードから紹介者を取得
              const referrer = await prisma.user.findUnique({
                where: { referralCode },
                select: { id: true }
              })

              if (referrer) {
                // 被紹介者を取得
                const referred = await prisma.user.findUnique({
                  where: { email: userEmail },
                  select: { id: true, role: true }
                })

                if (referred && referrer.id !== referred.id) {
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
                }
              }
            } catch (referralError) {
              console.error('Failed to register referral from checkout:', referralError)
              // 紹介登録失敗でも決済処理は続行
            }
          }
        }
        break

      case 'invoice.payment_succeeded':
        // 月次決済成功時の処理
        const invoice = event.data.object as Stripe.Invoice
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
        break

      case 'invoice.payment_failed':
        // 決済失敗時の処理
        const failedInvoice = event.data.object as Stripe.Invoice
        console.log('Payment failed for invoice:', failedInvoice.id)
        
        // サブスクリプションの状態を更新
        const failedSubscriptionId = (failedInvoice as any).subscription
        if (failedSubscriptionId) {
          const subId = typeof failedSubscriptionId === 'string' 
            ? failedSubscriptionId 
            : failedSubscriptionId.id

          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: {
              status: 'PAST_DUE'
            }
          })
        }
        // ここで決済失敗メールを送信するなどの処理を追加
        break

      case 'customer.subscription.deleted':
        // サブスクリプションキャンセル時の処理
        const cancelledSubscription = event.data.object as Stripe.Subscription
        console.log('Subscription cancelled:', cancelledSubscription.id)
        
        // サブスクリプションの状態を更新
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: cancelledSubscription.id },
          data: {
            status: 'CANCELED'
          }
        })
        // ここでキャンセルメールを送信するなどの処理を追加
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
