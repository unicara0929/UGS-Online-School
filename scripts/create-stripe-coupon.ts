/**
 * Stripeクーポン・プロモーションコード作成スクリプト
 *
 * 使い方:
 * npx tsx scripts/create-stripe-coupon.ts
 *
 * 環境変数:
 * - STRIPE_SECRET_KEY: StripeのシークレットAPIキー
 *
 * 作成されるクーポン:
 * - 80%オフ永続割引（月額5,500円 → 1,100円）
 *
 * ※初期費用（33,000円）の無料化はアプリ側で制御
 */

import Stripe from 'stripe'
import * as dotenv from 'dotenv'

// .env.local を読み込む
dotenv.config({ path: '.env.local' })

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia' as any,
})

async function createCouponAndPromoCode() {
  try {
    console.log('🚀 Starting coupon and promo code creation...\n')

    // 1. 80%オフ永続クーポンを作成
    const couponId = 'SPECIAL80_FOREVER'

    // 既存のクーポンをチェック
    let coupon: Stripe.Coupon
    try {
      coupon = await stripe.coupons.retrieve(couponId)
      console.log('ℹ️  Coupon already exists:', couponId)
    } catch {
      // 存在しない場合は作成
      coupon = await stripe.coupons.create({
        id: couponId,
        percent_off: 80,
        duration: 'forever',
        name: '特別割引80%オフ（永続）- 登録費用免除付き',
        metadata: {
          description: '月額80%オフ永続適用 + 登録費用免除',
          normal_price: '5500',
          discounted_price: '1100',
          setup_fee_waived: 'true',
        },
      })
      console.log('✅ Created coupon:', coupon.id)
      console.log('   - Discount: 80% off')
      console.log('   - Duration: forever')
    }

    // 2. プロモーションコードを作成
    const promoCode = 'SPECIAL2024'

    // 既存のプロモコードをチェック
    const existingPromoCodes = await stripe.promotionCodes.list({
      code: promoCode,
      limit: 1,
    })

    if (existingPromoCodes.data.length > 0) {
      console.log('\nℹ️  Promo code already exists:', promoCode)
      console.log('   ID:', existingPromoCodes.data[0].id)
    } else {
      const newPromoCode = await stripe.promotionCodes.create({
        coupon: couponId,
        code: promoCode,
        max_redemptions: 100, // 最大100回まで使用可能（必要に応じて変更）
        metadata: {
          description: '特別キャンペーン用プロモーションコード',
          created_by: 'script',
        },
      })
      console.log('\n✅ Created promo code:', newPromoCode.code)
      console.log('   ID:', newPromoCode.id)
      console.log('   Max redemptions:', newPromoCode.max_redemptions || 'unlimited')
    }

    console.log('\n📝 Summary:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Coupon ID:', couponId)
    console.log('Promo Code:', promoCode)
    console.log('Discount: 80% off (forever)')
    console.log('Setup Fee: Waived (controlled by app)')
    console.log('')
    console.log('Normal Price:')
    console.log('  - Setup Fee: ¥33,000')
    console.log('  - Monthly: ¥5,500')
    console.log('  - First Payment: ¥38,500')
    console.log('')
    console.log('With Promo Code:')
    console.log('  - Setup Fee: ¥0 (waived)')
    console.log('  - Monthly: ¥1,100 (80% off)')
    console.log('  - First Payment: ¥1,100')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n🎉 Done!')

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    if (error.type === 'StripeInvalidRequestError') {
      console.error('   Details:', error.raw?.message)
    }
    process.exit(1)
  }
}

// メイン実行
createCouponAndPromoCode()
