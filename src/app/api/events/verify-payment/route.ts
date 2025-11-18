import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendEventConfirmationEmail } from '@/lib/services/email-service'

/**
 * イベント決済確認API
 *
 * Webhookのフォールバック処理として機能
 * - ユーザーがStripeから戻ってきた時に呼ばれる
 * - Checkout Sessionのステータスを確認
 * - 支払い完了していれば、EventRegistrationを更新
 * - 冪等性を保証（既に更新済みの場合は何もしない）
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      )
    }

    console.log('[PAYMENT_VERIFY] Verifying payment for session:', sessionId)

    // Stripe Checkout Sessionを取得
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    console.log('[PAYMENT_VERIFY] Session status:', {
      sessionId,
      paymentStatus: session.payment_status,
      status: session.status,
      metadata: session.metadata
    })

    // 決済が完了していない場合
    if (session.payment_status !== 'paid') {
      console.log('[PAYMENT_VERIFY] Payment not completed yet')
      return NextResponse.json({
        success: false,
        status: 'pending',
        message: '決済が完了していません'
      })
    }

    // イベント決済でない場合
    if (session.metadata?.type !== 'event') {
      console.log('[PAYMENT_VERIFY] Not an event payment')
      return NextResponse.json({
        success: false,
        error: 'イベント決済ではありません'
      }, { status: 400 })
    }

    const { eventId, userId, registrationId } = session.metadata

    if (!registrationId) {
      console.error('[PAYMENT_VERIFY] Missing registrationId in metadata')
      return NextResponse.json({
        success: false,
        error: 'メタデータが不正です'
      }, { status: 400 })
    }

    // EventRegistrationを確認
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
        user: true
      }
    })

    if (!existingRegistration) {
      console.error('[PAYMENT_VERIFY] Registration not found:', registrationId)
      return NextResponse.json({
        success: false,
        error: '登録が見つかりません'
      }, { status: 404 })
    }

    // 既に支払い完了している場合（冪等性）
    if (existingRegistration.paymentStatus === 'PAID') {
      console.log('[PAYMENT_VERIFY] Payment already processed (idempotent)')
      return NextResponse.json({
        success: true,
        status: 'already_processed',
        message: '既に決済処理済みです',
        registration: {
          id: existingRegistration.id,
          paymentStatus: existingRegistration.paymentStatus,
          paidAt: existingRegistration.paidAt
        }
      })
    }

    // EventRegistrationを更新: PENDING → PAID
    console.log('[PAYMENT_VERIFY] Updating registration to PAID:', registrationId)

    const updatedRegistration = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        paymentStatus: 'PAID',
        stripePaymentIntentId: session.payment_intent as string,
        stripeSessionId: sessionId,
        paidAmount: session.amount_total || 0,
        paidAt: new Date(),
      },
      include: {
        event: true,
        user: true
      }
    })

    console.log('[PAYMENT_VERIFY] Payment updated successfully:', {
      eventId,
      userId,
      registrationId,
      amount: session.amount_total
    })

    // イベント参加確定メールを送信
    try {
      await sendEventConfirmationEmail({
        to: updatedRegistration.user.email,
        userName: updatedRegistration.user.name,
        eventTitle: updatedRegistration.event.title,
        eventDate: updatedRegistration.event.date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        }),
        eventTime: updatedRegistration.event.time || undefined,
        eventLocation: updatedRegistration.event.location || undefined,
        venueType: updatedRegistration.event.venueType,
        eventId: updatedRegistration.event.id,
      })
      console.log('[PAYMENT_VERIFY] Confirmation email sent to:', updatedRegistration.user.email)
    } catch (emailError) {
      console.error('[PAYMENT_VERIFY] Failed to send confirmation email:', emailError)
      // メール送信失敗でも処理は続行
    }

    return NextResponse.json({
      success: true,
      status: 'completed',
      message: '決済が完了しました',
      registration: {
        id: updatedRegistration.id,
        paymentStatus: updatedRegistration.paymentStatus,
        paidAt: updatedRegistration.paidAt,
        paidAmount: updatedRegistration.paidAmount
      }
    })

  } catch (error: any) {
    console.error('[PAYMENT_VERIFY] Error:', error)

    // Stripeエラーの詳細を出力
    if (error.type === 'StripeInvalidRequestError') {
      console.error('[PAYMENT_VERIFY] Stripe error:', {
        type: error.type,
        message: error.message,
        code: error.code
      })
    }

    return NextResponse.json({
      success: false,
      error: '決済確認に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
