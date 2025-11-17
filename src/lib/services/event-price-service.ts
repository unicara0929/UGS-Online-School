import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

/**
 * 有料イベント用のStripe Priceを作成
 */
export async function createEventPrice(params: {
  eventId: string
  eventTitle: string
  price: number // 円単位
}): Promise<string> {
  const { eventId, eventTitle, price } = params

  try {
    // Stripe Productを作成（イベントごとに1つ）
    const product = await stripe.products.create({
      name: `イベント: ${eventTitle}`,
      metadata: {
        eventId,
        type: 'event',
      },
    })

    // Stripe Priceを作成（一回限りの支払い）
    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: price,
      currency: 'jpy',
      metadata: {
        eventId,
      },
    })

    // Event レコードに stripePriceId を保存
    await prisma.event.update({
      where: { id: eventId },
      data: { stripePriceId: stripePrice.id },
    })

    console.log(`Stripe Price created for event ${eventId}: ${stripePrice.id}`)
    return stripePrice.id
  } catch (error) {
    console.error('Failed to create Stripe Price for event:', error)
    throw new Error('Stripe Price作成に失敗しました')
  }
}

/**
 * イベントのStripe Priceを削除（イベント削除時）
 */
export async function deleteEventPrice(stripePriceId: string): Promise<void> {
  try {
    // Priceをアーカイブ（Stripeでは削除ではなくアーカイブ）
    await stripe.prices.update(stripePriceId, {
      active: false,
    })

    console.log(`Stripe Price archived: ${stripePriceId}`)
  } catch (error) {
    console.error('Failed to archive Stripe Price:', error)
    // エラーでも続行（イベント削除処理を止めない）
  }
}

/**
 * イベント価格の更新（既存Priceを無効化して新規作成）
 * Stripe Priceは一度作成すると金額変更不可のため、新規作成が必要
 */
export async function updateEventPrice(params: {
  eventId: string
  eventTitle: string
  oldStripePriceId: string | null
  newPrice: number
}): Promise<string> {
  const { eventId, eventTitle, oldStripePriceId, newPrice } = params

  try {
    // 既存Priceがあれば無効化
    if (oldStripePriceId) {
      await deleteEventPrice(oldStripePriceId)
    }

    // 新しいPriceを作成
    const newPriceId = await createEventPrice({
      eventId,
      eventTitle,
      price: newPrice,
    })

    return newPriceId
  } catch (error) {
    console.error('Failed to update event price:', error)
    throw new Error('イベント価格の更新に失敗しました')
  }
}
