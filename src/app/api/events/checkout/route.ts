import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

/**
 * 有料イベント用チェックアウトセッション作成API
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

    // イベント情報を取得
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 無料イベントの場合はエラー
    if (!event.isPaid || !event.price || !event.stripePriceId) {
      return NextResponse.json(
        { error: 'このイベントは有料イベントではありません' },
        { status: 400 }
      )
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        subscriptions: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 既に登録済みかチェック
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId: event.id,
        },
      },
    })

    if (existingRegistration) {
      return NextResponse.json(
        { error: '既にこのイベントに登録済みです' },
        { status: 400 }
      )
    }

    // EventRegistrationをPENDINGステータスで作成
    const registration = await prisma.eventRegistration.create({
      data: {
        userId: user.id,
        eventId: event.id,
        paymentStatus: 'PENDING',
      },
    })

    // Stripe Checkout Sessionを作成
    const subscription = user.subscriptions?.[0]
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: subscription?.stripeCustomerId || undefined,
      customer_email: subscription?.stripeCustomerId ? undefined : user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: event.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // サブスクリプションではなく一回限りの支払い
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/events?payment=success&eventId=${event.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/events?payment=canceled&eventId=${event.id}`,
      metadata: {
        type: 'event',
        eventId: event.id,
        userId: user.id,
        registrationId: registration.id,
        eventTitle: event.title,
      },
    })

    // Checkout Session IDを登録レコードに保存
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        stripeSessionId: checkoutSession.id,
      },
    })

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('Event checkout error:', error)
    return NextResponse.json(
      { error: 'チェックアウトセッションの作成に失敗しました' },
      { status: 500 }
    )
  }
}
