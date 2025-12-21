/**
 * 決済リンク生成サービス
 * メール送信時にStripe Checkout Sessionを作成し、短縮URLを返す
 */

import { stripe } from '@/lib/stripe'

/**
 * ユーザーの決済リンクを作成
 * @param email ユーザーのメールアドレス
 * @param name ユーザーの名前
 * @returns 決済リンク（短縮URL）または null（エラー時）
 */
export async function createPaymentLink(
  email: string,
  name: string
): Promise<string | null> {
  try {
    console.log(`  🔄 createPaymentLink開始: ${email}, ${name}`)
    const targetAmount = 5500 // ¥5,500

    // ¥5,500の価格を検索
    const allPrices = await stripe.prices.list({
      limit: 100,
      active: true,
    })

    const targetPrice = allPrices.data.find(
      (p) =>
        p.unit_amount === targetAmount &&
        p.currency === 'jpy' &&
        p.active === true &&
        p.recurring?.interval === 'month'
    )

    let priceId: string

    if (targetPrice) {
      priceId = targetPrice.id
      console.log(`  ✅ 既存の価格を使用: ${priceId}`)
    } else {
      // 価格が見つからない場合は新規作成
      console.log(`  ⚠️ 価格が見つからないため新規作成中...`)
      const product = await stripe.products.create({
        name: 'UGS月額プラン',
        description: '"勉強だけで終わらない"「お金の知識×稼げる力」がコンセプトのビジネスコミュニティ',
      })

      const price = await stripe.prices.create({
        unit_amount: targetAmount,
        currency: 'jpy',
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
        product: product.id,
      })
      priceId = price.id
      console.log(`  ✅ 新規価格作成: ${priceId}`)
    }

    // Checkout Sessionを作成（有効期限30日）
    console.log(`  🔄 Checkout Session作成中...`)
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30日後

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: email,
      expires_at: expiresAt, // 有効期限を30日に設定
      metadata: {
        userName: name,
        userEmail: email,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`,
      subscription_data: {
        metadata: {
          userName: name,
          userEmail: email,
        },
      },
    })

    console.log(`  ✅ Session作成成功: ${session.id}`)
    console.log(`  🔗 元のURL: ${session.url}`)
    console.log(`  ⏰ 有効期限: ${new Date(expiresAt * 1000).toLocaleString('ja-JP')}`)

    // 短縮URLを生成
    const shortUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${session.id}`
    console.log(`  ✂️ 短縮URL: ${shortUrl}`)

    return shortUrl
  } catch (error) {
    console.error(`  ❌ 決済リンク作成エラー (${email}):`, error)
    return null
  }
}
