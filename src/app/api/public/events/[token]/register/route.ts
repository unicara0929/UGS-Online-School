import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

// 外部参加者登録
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { name, email, phone, referrer } = body

    // バリデーション
    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, error: '名前、メールアドレス、電話番号は必須です' },
        { status: 400 }
      )
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      )
    }

    // イベントを取得
    const event = await prisma.event.findUnique({
      where: {
        externalRegistrationToken: token,
      },
      include: {
        _count: {
          select: {
            registrations: true,
            externalRegistrations: true,
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 外部参加が許可されていない場合
    if (!event.allowExternalParticipation) {
      return NextResponse.json(
        { success: false, error: 'このイベントは外部参加を受け付けていません' },
        { status: 403 }
      )
    }

    // イベントがキャンセル済みの場合
    if (event.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'このイベントはキャンセルされました' },
        { status: 410 }
      )
    }

    // 申込期限チェック
    if (event.applicationDeadline && new Date(event.applicationDeadline) < new Date()) {
      return NextResponse.json(
        { success: false, error: '申込期限が過ぎています' },
        { status: 410 }
      )
    }

    // 定員チェック
    const currentParticipants = event._count.registrations + event._count.externalRegistrations
    // 定員チェック（0またはnullは制限なし）
    if (event.maxParticipants !== null && event.maxParticipants > 0 && currentParticipants >= event.maxParticipants) {
      return NextResponse.json(
        { success: false, error: '定員に達しています' },
        { status: 400 }
      )
    }

    // 重複登録チェック
    const existingRegistration = await prisma.externalEventRegistration.findUnique({
      where: {
        email_eventId: {
          email,
          eventId: event.id,
        }
      }
    })

    if (existingRegistration) {
      // 既に登録済みで、支払いが完了している場合
      if (existingRegistration.paymentStatus === 'PAID' || existingRegistration.paymentStatus === 'FREE') {
        return NextResponse.json(
          { success: false, error: 'このメールアドレスは既に登録されています' },
          { status: 400 }
        )
      }

      // PENDINGの場合は再度チェックアウトURLを生成
      if (existingRegistration.paymentStatus === 'PENDING' && event.isPaid) {
        // Stripeチェックアウトセッションを作成
        const checkoutSession = await createCheckoutSession(event, existingRegistration.id, email)

        // セッションIDを更新
        await prisma.externalEventRegistration.update({
          where: { id: existingRegistration.id },
          data: {
            stripeSessionId: checkoutSession.id,
            name,
            phone,
          }
        })

        return NextResponse.json({
          success: true,
          requiresPayment: true,
          checkoutUrl: checkoutSession.url,
          registrationId: existingRegistration.id,
        })
      }
    }

    // 無料イベントの場合
    if (!event.isPaid) {
      const registration = await prisma.externalEventRegistration.create({
        data: {
          eventId: event.id,
          name,
          email,
          phone,
          referrer: referrer || null,
          paymentStatus: 'FREE',
        }
      })

      // 確認メール送信
      try {
        await sendExternalEventConfirmationEmail({
          to: email,
          name,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time || undefined,
          eventLocation: event.location || undefined,
          onlineMeetingUrl: event.onlineMeetingUrl || undefined,
        })
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError)
        // メール送信失敗しても登録は成功とする
      }

      return NextResponse.json({
        success: true,
        requiresPayment: false,
        registrationToken: registration.registrationToken,
        registrationId: registration.id,
      })
    }

    // 有料イベントの場合
    // 1. まず登録を作成（PENDING状態）
    const registration = await prisma.externalEventRegistration.create({
      data: {
        eventId: event.id,
        name,
        email,
        phone,
        referrer: referrer || null,
        paymentStatus: 'PENDING',
      }
    })

    // 2. Stripeチェックアウトセッションを作成
    const checkoutSession = await createCheckoutSession(event, registration.id, email)

    // 3. セッションIDを保存
    await prisma.externalEventRegistration.update({
      where: { id: registration.id },
      data: {
        stripeSessionId: checkoutSession.id,
      }
    })

    return NextResponse.json({
      success: true,
      requiresPayment: true,
      checkoutUrl: checkoutSession.url,
      registrationId: registration.id,
    })

  } catch (error) {
    console.error('Error registering external participant:', error)
    return NextResponse.json(
      { success: false, error: '登録に失敗しました' },
      { status: 500 }
    )
  }
}

// Stripeチェックアウトセッション作成
async function createCheckoutSession(
  event: { id: string; title: string; price: number | null; stripePriceId: string | null; externalRegistrationToken: string | null },
  registrationId: string,
  customerEmail: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // 既存のStripePriceIdがある場合はそれを使用、なければline_itemsで価格を指定
  const lineItems = event.stripePriceId
    ? [{ price: event.stripePriceId, quantity: 1 }]
    : [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: event.title,
            description: `イベント参加費: ${event.title}`,
          },
          unit_amount: event.price || 0,
        },
        quantity: 1,
      }]

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${baseUrl}/events/${event.externalRegistrationToken}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/events/${event.externalRegistrationToken}/register?canceled=true`,
    customer_email: customerEmail,
    metadata: {
      type: 'external-event',
      eventId: event.id,
      externalRegistrationId: registrationId,
    },
  })

  return session
}

// 外部参加者向け確認メール送信
async function sendExternalEventConfirmationEmail(params: {
  to: string
  name: string
  eventTitle: string
  eventDate: Date
  eventTime?: string
  eventLocation?: string
  onlineMeetingUrl?: string
}): Promise<void> {
  const { sendEmail } = await import('@/lib/email')
  const { format } = await import('date-fns')
  const { ja } = await import('date-fns/locale')

  const formattedDate = format(params.eventDate, 'yyyy年M月d日(E)', { locale: ja })
  const subject = `【UGS】イベント参加確定：${params.eventTitle}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
        .event-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .event-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .event-detail { color: #666; margin: 5px 0; }
        .online-link { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196f3; }
        .online-link a { color: #1976d2; text-decoration: none; word-break: break-all; }
        .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">イベント参加確定</h1>
        </div>
        <div class="content">
          <p>${params.name} 様</p>
          <p>以下のイベントへの参加が確定しました。</p>

          <div class="event-info">
            <div class="event-title">${params.eventTitle}</div>
            <div class="event-detail">日時: ${formattedDate}${params.eventTime ? ` ${params.eventTime}` : ''}</div>
            ${params.eventLocation ? `<div class="event-detail">場所: ${params.eventLocation}</div>` : ''}
          </div>

          ${params.onlineMeetingUrl ? `
          <div class="online-link">
            <strong>オンライン参加URL:</strong><br>
            <a href="${params.onlineMeetingUrl}">${params.onlineMeetingUrl}</a>
          </div>
          ` : ''}

          <p>ご参加をお待ちしております。</p>
          <p>ご不明点がございましたら、事務局までお問い合わせください。</p>

          <div class="footer">
            <p>このメールはUGSから自動送信されています。</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({ to: params.to, subject, html })
}
