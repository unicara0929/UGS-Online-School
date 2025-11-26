import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

/**
 * プロモーションコードを検証するAPI
 * 有効なコードの場合、割引情報を返す
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'プロモーションコードを入力してください' },
        { status: 400 }
      )
    }

    // Stripeでプロモーションコードを検索（couponを展開）
    const promotionCodes = await stripe.promotionCodes.list({
      code: code.trim().toUpperCase(),
      active: true,
      limit: 1,
      expand: ['data.coupon'],
    })

    if (promotionCodes.data.length === 0) {
      return NextResponse.json(
        { error: '無効なプロモーションコードです' },
        { status: 400 }
      )
    }

    const promoCode = promotionCodes.data[0] as any

    // 新しいAPIバージョンでは promotion.coupon にクーポンIDがある
    const couponId = promoCode.promotion?.coupon || promoCode.coupon
    if (!couponId) {
      console.error('Coupon ID not found in promo code:', promoCode)
      return NextResponse.json(
        { error: 'クーポン情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    // クーポンを取得
    const coupon = typeof couponId === 'string'
      ? await stripe.coupons.retrieve(couponId)
      : couponId as Stripe.Coupon

    // クーポンの詳細情報を取得
    const discountInfo = {
      promoCodeId: promoCode.id,
      code: promoCode.code,
      couponId: coupon.id,
      percentOff: coupon.percent_off,
      amountOff: coupon.amount_off,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months,
      name: coupon.name,
      valid: coupon.valid,
    }

    // 割引の説明文を生成
    let discountDescription = ''
    if (coupon.percent_off) {
      discountDescription = `${coupon.percent_off}%オフ`
    } else if (coupon.amount_off) {
      discountDescription = `¥${coupon.amount_off.toLocaleString()}オフ`
    }

    // 期間の説明
    let durationDescription = ''
    switch (coupon.duration) {
      case 'forever':
        durationDescription = '永続適用'
        break
      case 'once':
        durationDescription = '初回のみ'
        break
      case 'repeating':
        durationDescription = `${coupon.duration_in_months}ヶ月間`
        break
    }

    return NextResponse.json({
      valid: true,
      promoCodeId: promoCode.id,
      code: promoCode.code,
      discount: discountInfo,
      discountDescription,
      durationDescription,
      // 月額5,500円を基準に計算
      estimatedMonthlyPrice: coupon.percent_off
        ? Math.round(5500 * (1 - coupon.percent_off / 100))
        : coupon.amount_off
        ? Math.max(0, 5500 - coupon.amount_off)
        : 5500,
    })
  } catch (error: any) {
    console.error('Promo code validation error:', error)
    return NextResponse.json(
      { error: 'プロモーションコードの検証に失敗しました' },
      { status: 500 }
    )
  }
}
