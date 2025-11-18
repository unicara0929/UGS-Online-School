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
      console.error('Event not found:', eventId)
      return NextResponse.json(
        { error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    console.log('Event checkout request:', {
      eventId: event.id,
      title: event.title,
      isPaid: event.isPaid,
      price: event.price,
      stripePriceId: event.stripePriceId,
      userId: authUser.id
    })

    // 無料イベントの場合はエラー
    if (!event.isPaid || !event.price || !event.stripePriceId) {
      console.error('Invalid paid event configuration:', {
        eventId: event.id,
        isPaid: event.isPaid,
        price: event.price,
        stripePriceId: event.stripePriceId
      })
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

    // 既存のRegistrationがある場合の処理
    let registration = existingRegistration

    if (existingRegistration) {
      // 既に支払い完了している場合はエラー
      if (existingRegistration.paymentStatus === 'PAID') {
        return NextResponse.json(
          { error: '既にこのイベントの支払いが完了しています' },
          { status: 400 }
        )
      }

      // PENDING状態の場合は、新しいCheckout Sessionを作成するために既存のRegistrationを使用
      console.log('Existing PENDING registration found, creating new checkout session')
    } else {
      // 新規登録の場合、EventRegistrationをPENDINGステータスで作成
      registration = await prisma.eventRegistration.create({
        data: {
          userId: user.id,
          eventId: event.id,
          paymentStatus: 'PENDING',
        },
      })
    }

    // registrationが存在することを確認
    if (!registration) {
      return NextResponse.json(
        { error: 'Registrationの作成に失敗しました' },
        { status: 500 }
      )
    }

    // Stripe Checkout Sessionを作成
    const subscription = user.subscriptions?.[0]
    let customerId: string | undefined = subscription?.stripeCustomerId || undefined

    // Customer IDが存在する場合、Stripeで有効か確認
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId)
        console.log('Stripe Customer exists:', customerId)
      } catch (error: any) {
        console.warn('Stripe Customer not found, will create new session without customer:', {
          customerId,
          error: error.message
        })
        customerId = undefined
      }
    }

    console.log('Creating Stripe checkout session:', {
      customerId: customerId || 'none',
      email: customerId ? undefined : user.email,
      stripePriceId: event.stripePriceId,
      eventTitle: event.title
    })

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: event.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // サブスクリプションではなく一回限りの支払い
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/events?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/events?payment=canceled&eventId=${event.id}`,
      metadata: {
        type: 'event',
        eventId: event.id,
        userId: user.id,
        registrationId: registration.id,
        eventTitle: event.title,
      },
    })

    console.log('Checkout session created successfully:', checkoutSession.id)

    // Checkout Session IDを登録レコードに保存
    if (registration) {
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          stripeSessionId: checkoutSession.id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('Event checkout error:', error)

    // Stripeエラーの詳細を出力
    if (error && typeof error === 'object' && 'type' in error) {
      console.error('Stripe error details:', {
        type: (error as any).type,
        message: (error as any).message,
        code: (error as any).code,
        param: (error as any).param
      })
    }

    // より詳細なエラーメッセージを返す（開発環境のみ）
    const isDev = process.env.NODE_ENV === 'development'
    const errorMessage = isDev && error instanceof Error ? error.message : 'チェックアウトセッションの作成に失敗しました'

    return NextResponse.json(
      {
        error: errorMessage,
        details: isDev ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
