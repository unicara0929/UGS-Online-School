import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

/**
 * イベント参加費返金API
 * 支払い済み(PAID)のEventRegistrationを返金してキャンセルする
 * POST /api/events/refund
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

    const { eventId } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { error: 'イベントIDが必要です' },
        { status: 400 }
      )
    }

    // 既存のRegistrationを確認
    const registration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId: authUser.id,
          eventId: eventId,
        },
      },
      include: {
        event: true,
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'このイベントに登録されていません' },
        { status: 404 }
      )
    }

    // 支払い済みでない場合は返金不要
    if (registration.paymentStatus !== 'PAID') {
      return NextResponse.json(
        { error: 'このイベントは支払い済みではありません' },
        { status: 400 }
      )
    }

    // Stripe Payment Intentが必要
    if (!registration.stripePaymentIntentId) {
      return NextResponse.json(
        { error: '決済情報が見つかりません' },
        { status: 400 }
      )
    }

    // Stripeで返金処理を実行
    try {
      const refund = await stripe.refunds.create({
        payment_intent: registration.stripePaymentIntentId,
        reason: 'requested_by_customer',
      })

      console.log(`Refund created for event registration: ${refund.id}`)

      // EventRegistrationを削除
      await prisma.eventRegistration.delete({
        where: {
          userId_eventId: {
            userId: authUser.id,
            eventId: eventId,
          },
        },
      })

      console.log(`Event registration refunded and deleted: userId=${authUser.id}, eventId=${eventId}`)

      return NextResponse.json({
        success: true,
        message: 'イベント参加費を返金しました',
        refundId: refund.id,
      })
    } catch (stripeError: any) {
      console.error('Stripe refund error:', stripeError)
      return NextResponse.json(
        { error: `返金処理に失敗しました: ${stripeError.message}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Event refund error:', error)
    return NextResponse.json(
      { error: '返金処理に失敗しました' },
      { status: 500 }
    )
  }
}
