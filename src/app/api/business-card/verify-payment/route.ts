import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import {
  sendBusinessCardOrderConfirmationEmail,
  sendBusinessCardOrderNotificationToAdmin,
} from '@/lib/email'

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'UGS会員',
  FP: 'FPエイド',
  MANAGER: 'マネージャー',
  ADMIN: '管理者',
}

const DELIVERY_LABELS: Record<string, string> = {
  PICKUP: 'UGS本社で手渡し受け取り',
  SHIPPING: 'レターパック郵送',
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'セッションIDが必要です' },
        { status: 400 }
      )
    }

    // Stripe Sessionを取得
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    // 支払いステータスを確認
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: '決済が完了していません' },
        { status: 400 }
      )
    }

    // メタデータから注文情報を取得
    const orderId = session.metadata?.orderId
    const metadataType = session.metadata?.type

    if (metadataType !== 'business-card' || !orderId) {
      return NextResponse.json(
        { success: false, error: '無効な決済セッションです' },
        { status: 400 }
      )
    }

    // 注文を取得
    const order = await prisma.businessCardOrder.findUnique({
      where: { id: orderId },
      include: {
        design: { select: { name: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: '注文が見つかりません' },
        { status: 404 }
      )
    }

    // 既に支払い完了している場合はスキップ（冪等性）
    if (order.paymentStatus === 'PAID') {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        message: '既に決済が完了しています',
      })
    }

    // ユーザーの確認
    if (order.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    // 注文ステータスを更新
    const updatedOrder = await prisma.businessCardOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'PAID', // 決済完了・受付中
        stripePaymentIntentId: session.payment_intent as string,
        paidAmount: session.amount_total || 0,
        paidAt: new Date(),
      },
      include: {
        design: { select: { name: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    // メール通知を送信（エラーでも処理は継続）
    try {
      // ユーザーへの確認メール
      await sendBusinessCardOrderConfirmationEmail({
        to: updatedOrder.user.email,
        userName: updatedOrder.user.name,
        orderId: updatedOrder.id,
        displayName: updatedOrder.displayName,
        displayNameKana: updatedOrder.displayNameKana,
        phoneNumber: updatedOrder.phoneNumber,
        email: updatedOrder.email,
        deliveryMethod: updatedOrder.deliveryMethod,
        deliveryMethodLabel: DELIVERY_LABELS[updatedOrder.deliveryMethod],
        postalCode: updatedOrder.postalCode,
        prefecture: updatedOrder.prefecture,
        city: updatedOrder.city,
        addressLine1: updatedOrder.addressLine1,
        addressLine2: updatedOrder.addressLine2,
        designName: updatedOrder.design.name,
        quantity: updatedOrder.quantity,
        paidAmount: updatedOrder.paidAmount || 0,
      })

      // 管理者への通知
      await sendBusinessCardOrderNotificationToAdmin({
        userName: updatedOrder.user.name,
        userEmail: updatedOrder.user.email,
        userRole: ROLE_LABELS[updatedOrder.user.role] || updatedOrder.user.role,
        orderId: updatedOrder.id,
        displayName: updatedOrder.displayName,
        deliveryMethod: updatedOrder.deliveryMethod,
        deliveryMethodLabel: DELIVERY_LABELS[updatedOrder.deliveryMethod],
        designName: updatedOrder.design.name,
        quantity: updatedOrder.quantity,
        paidAmount: updatedOrder.paidAmount || 0,
      })
    } catch (emailError) {
      console.error('Failed to send business card order emails:', emailError)
    }

    return NextResponse.json({
      success: true,
      orderId: updatedOrder.id,
      message: '決済が完了しました',
    })
  } catch (error) {
    console.error('Error verifying business card payment:', error)
    return NextResponse.json(
      { success: false, error: '決済の確認に失敗しました' },
      { status: 500 }
    )
  }
}
