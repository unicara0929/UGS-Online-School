import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// 受取方法ごとの料金（円）
const DELIVERY_PRICES: Record<string, number> = {
  PICKUP: 2400,   // UGS本社での手渡し受け取り
  SHIPPING: 2950, // レターパック郵送
}

const DELIVERY_LABELS: Record<string, string> = {
  PICKUP: 'UGS本社で手渡し受け取り',
  SHIPPING: 'レターパック郵送',
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    // FPエイド以上のみアクセス可能
    if (!user || !['FP', 'MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      designId,
      displayName,
      displayNameKana,
      phoneNumber,
      email,
      cardAddress,
      deliveryMethod,
      postalCode,
      prefecture,
      city,
      addressLine1,
      addressLine2,
      quantity,
      notes,
    } = body

    // バリデーション
    const errors: string[] = []

    if (!designId) errors.push('デザインを選択してください')
    if (!displayName?.trim()) errors.push('表示名を入力してください')
    if (!displayNameKana?.trim()) errors.push('フリガナを入力してください')
    if (!phoneNumber?.trim()) errors.push('電話番号を入力してください')
    if (!email?.trim()) errors.push('メールアドレスを入力してください')
    if (!cardAddress?.trim()) errors.push('住所を入力してください')
    if (!deliveryMethod || !['PICKUP', 'SHIPPING'].includes(deliveryMethod)) {
      errors.push('受取方法を選択してください')
    }

    // 郵送の場合は郵送先住所必須
    if (deliveryMethod === 'SHIPPING') {
      if (!postalCode?.trim()) errors.push('郵便番号を入力してください')
      if (!prefecture?.trim()) errors.push('都道府県を入力してください')
      if (!city?.trim()) errors.push('市区町村を入力してください')
      if (!addressLine1?.trim()) errors.push('番地を入力してください')
    }

    // フォーマットチェック
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('メールアドレスの形式が正しくありません')
    }
    if (phoneNumber && !/^[\d-]+$/.test(phoneNumber)) {
      errors.push('電話番号の形式が正しくありません')
    }
    if (postalCode && deliveryMethod === 'SHIPPING' && !/^\d{3}-?\d{4}$/.test(postalCode)) {
      errors.push('郵便番号の形式が正しくありません（例: 123-4567）')
    }
    if (displayNameKana && !/^[\u30A0-\u30FF\u3000\s]+$/.test(displayNameKana)) {
      errors.push('フリガナはカタカナで入力してください')
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join('、') },
        { status: 400 }
      )
    }

    // デザインの存在確認
    const design = await prisma.businessCardDesign.findUnique({
      where: { id: designId },
    })

    if (!design || !design.isActive) {
      return NextResponse.json(
        { success: false, error: '選択されたデザインは利用できません' },
        { status: 400 }
      )
    }

    // 金額を取得
    const price = DELIVERY_PRICES[deliveryMethod]
    if (!price) {
      return NextResponse.json(
        { success: false, error: '無効な受取方法です' },
        { status: 400 }
      )
    }

    // 注文レコードを作成（決済待ち状態）
    const order = await prisma.businessCardOrder.create({
      data: {
        userId: user.id,
        designId,
        displayName: displayName.trim(),
        displayNameKana: displayNameKana.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        cardAddress: cardAddress?.trim() || null,
        deliveryMethod: deliveryMethod as 'PICKUP' | 'SHIPPING',
        postalCode: postalCode?.trim() || null,
        prefecture: prefecture?.trim() || null,
        city: city?.trim() || null,
        addressLine1: addressLine1?.trim() || null,
        addressLine2: addressLine2?.trim() || null,
        quantity: quantity || 100,
        notes: notes?.trim() || null,
        status: 'PENDING',
        paymentStatus: 'PENDING',
      },
    })

    // Stripe Checkout Sessionを作成
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: '名刺注文',
              description: `${design.name} / ${DELIVERY_LABELS[deliveryMethod]}`,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/business-card/order?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/business-card/order?payment=canceled`,
      metadata: {
        type: 'business-card',
        orderId: order.id,
        userId: user.id,
        deliveryMethod,
        designName: design.name,
      },
    })

    // 注文にStripe Session IDを保存
    await prisma.businessCardOrder.update({
      where: { id: order.id },
      data: { stripeSessionId: checkoutSession.id },
    })

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      orderId: order.id,
    })
  } catch (error) {
    console.error('Error creating business card checkout:', error)
    return NextResponse.json(
      { success: false, error: '決済処理の開始に失敗しました' },
      { status: 500 }
    )
  }
}
