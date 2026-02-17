import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { parseExternalFormFields, validateCustomFieldAnswers } from '@/lib/validations/event'

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
    const { name: rawName, email: rawEmail, phone: rawPhone, referrer, scheduleId, customFieldAnswers } = body

    // 入力値のサニタイズ（文字列型チェック + トリム + 長さ制限）
    if (typeof rawName !== 'string' || typeof rawEmail !== 'string' || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { success: false, error: '名前、メールアドレス、電話番号は文字列で入力してください' },
        { status: 400 }
      )
    }

    const name = rawName.trim().slice(0, 200)
    const email = rawEmail.trim().toLowerCase().slice(0, 254)
    const phone = rawPhone.trim().slice(0, 20)

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

    // 電話番号形式チェック（数字、ハイフン、プラス記号のみ）
    const phoneRegex = /^[0-9+\-() ]{6,20}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { success: false, error: '有効な電話番号を入力してください' },
        { status: 400 }
      )
    }

    // イベントを取得
    const event = await prisma.event.findUnique({
      where: {
        externalRegistrationToken: token,
      },
      include: {
        schedules: {
          orderBy: { date: 'asc' },
          include: {
            _count: {
              select: {
                registrations: true,
                externalRegistrations: true,
              }
            }
          }
        },
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

    // カスタムフィールドのバリデーション（型安全）
    const { fields: formFields } = parseExternalFormFields(event.externalFormFields)
    let sanitizedAnswers: Record<string, string | string[] | number> | undefined
    if (formFields.length > 0) {
      const { valid, error: answerError, sanitized } = validateCustomFieldAnswers(customFieldAnswers, formFields)
      if (!valid) {
        return NextResponse.json(
          { success: false, error: answerError },
          { status: 400 }
        )
      }
      sanitizedAnswers = Object.keys(sanitized).length > 0 ? sanitized : undefined
    }

    // referrer のサニタイズ
    let effectiveReferrer: string | null = null
    if (referrer !== undefined && referrer !== null) {
      if (typeof referrer !== 'string') {
        return NextResponse.json(
          { success: false, error: '紹介者は文字列で入力してください' },
          { status: 400 }
        )
      }
      effectiveReferrer = referrer.trim().slice(0, 200) || null
    }
    if (sanitizedAnswers && formFields.length > 0) {
      const referrerField = formFields.find(f => f.label === '紹介者')
      if (referrerField && sanitizedAnswers[referrerField.id]) {
        effectiveReferrer = String(sanitizedAnswers[referrerField.id])
      }
    }

    // scheduleId のバリデーション
    if (scheduleId !== undefined && scheduleId !== null && typeof scheduleId !== 'string') {
      return NextResponse.json(
        { success: false, error: '日程IDが不正です' },
        { status: 400 }
      )
    }

    // 対象スケジュールを決定
    let targetSchedule = event.schedules[0]
    if (scheduleId) {
      const found = event.schedules.find(s => s.id === scheduleId)
      if (!found) {
        return NextResponse.json(
          { success: false, error: '指定された日程が見つかりません' },
          { status: 400 }
        )
      }
      targetSchedule = found
    }

    // 申込期限チェック（日数ベース）
    if (event.applicationDeadlineDays !== null && targetSchedule) {
      const deadline = new Date(targetSchedule.date)
      deadline.setDate(deadline.getDate() - event.applicationDeadlineDays)
      if (new Date() > deadline) {
        return NextResponse.json(
          { success: false, error: '申込期限が過ぎています' },
          { status: 410 }
        )
      }
    }

    // 現在の参加者数を計算
    const currentParticipants = event._count.registrations + event._count.externalRegistrations

    // 重複登録チェック（同じイベント・スケジュールに登録済みか）
    const existingRegistration = await prisma.externalEventRegistration.findFirst({
      where: {
        email,
        eventId: event.id,
        scheduleId: targetSchedule?.id ?? null,
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
          scheduleId: targetSchedule?.id ?? null,
          name,
          email,
          phone,
          referrer: effectiveReferrer,
          customFieldAnswers: sanitizedAnswers,
          paymentStatus: 'FREE',
        }
      })

      // 確認メール送信
      try {
        await sendExternalEventConfirmationEmail({
          to: email,
          name,
          eventTitle: event.title,
          eventDate: targetSchedule?.date ?? new Date(),
          eventTime: targetSchedule?.time || undefined,
          eventLocation: targetSchedule?.location || undefined,
          onlineMeetingUrl: targetSchedule?.onlineMeetingUrl || undefined,
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
        scheduleId: targetSchedule?.id ?? null,
        name,
        email,
        phone,
        referrer: effectiveReferrer,
        customFieldAnswers: sanitizedAnswers,
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

  } catch (error: unknown) {
    // Prisma unique constraint violation（重複登録の競合）
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { success: false, error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      )
    }
    console.error('Error registering external participant:', error instanceof Error ? error.message : error)
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
          unit_amount: event.price && event.price > 0 ? event.price : (() => { throw new Error('有料イベントの価格が設定されていません') })(),
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
  const { sendEmail, escapeHtml } = await import('@/lib/email')
  const { format } = await import('date-fns')
  const { ja } = await import('date-fns/locale')

  const formattedDate = format(params.eventDate, 'yyyy年M月d日(E)', { locale: ja })
  const subject = `【UGS】イベント参加確定：${params.eventTitle}`

  // HTMLインジェクション防止: ユーザー入力値をエスケープ
  const safeName = escapeHtml(params.name)
  const safeTitle = escapeHtml(params.eventTitle)
  const safeTime = params.eventTime ? escapeHtml(params.eventTime) : ''
  const safeLocation = params.eventLocation ? escapeHtml(params.eventLocation) : ''
  // URLはhttps://で始まるかチェック
  const safeOnlineUrl = params.onlineMeetingUrl && /^https?:\/\//i.test(params.onlineMeetingUrl)
    ? params.onlineMeetingUrl
    : undefined

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
          <p>${safeName} 様</p>
          <p>以下のイベントへの参加が確定しました。</p>

          <div class="event-info">
            <div class="event-title">${safeTitle}</div>
            <div class="event-detail">日時: ${escapeHtml(formattedDate)}${safeTime ? ` ${safeTime}` : ''}</div>
            ${safeLocation ? `<div class="event-detail">場所: ${safeLocation}</div>` : ''}
          </div>

          ${safeOnlineUrl ? `
          <div class="online-link">
            <strong>オンライン参加URL:</strong><br>
            <a href="${safeOnlineUrl}">${escapeHtml(safeOnlineUrl)}</a>
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
