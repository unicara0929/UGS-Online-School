import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { sendPaymentConfirmationEmail } from '@/lib/email'
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
        }
        break

      case 'invoice.payment_succeeded':
        // 月次決済成功時の処理
        const invoice = event.data.object as Stripe.Invoice
        console.log('Monthly payment succeeded for invoice:', invoice.id)
        break

      case 'invoice.payment_failed':
        // 決済失敗時の処理
        const failedInvoice = event.data.object as Stripe.Invoice
        console.log('Payment failed for invoice:', failedInvoice.id)
        // ここで決済失敗メールを送信するなどの処理を追加
        break

      case 'customer.subscription.deleted':
        // サブスクリプションキャンセル時の処理
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription cancelled:', subscription.id)
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
