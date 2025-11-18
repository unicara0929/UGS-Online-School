import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 全イベントのStripe Price整合性チェックAPI
 * GET /api/admin/events/validate-prices
 *
 * 管理者が定期的に実行して、データベースとStripeの不整合を検出する
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    // 全有料イベントを取得
    const paidEvents = await prisma.event.findMany({
      where: { isPaid: true },
      select: {
        id: true,
        title: true,
        price: true,
        stripePriceId: true,
        date: true,
        status: true,
      },
      orderBy: { date: 'desc' },
    })

    const results = []
    const currentEnv = process.env.STRIPE_SECRET_KEY?.includes('test') ? 'test' : 'live'

    for (const event of paidEvents) {
      const issues: string[] = []

      // stripePriceIdが未設定
      if (!event.stripePriceId) {
        issues.push('stripePriceIdが未設定（イベント作成時のエラー可能性）')
      } else {
        try {
          // Stripe APIで検証
          const stripePrice = await stripe.prices.retrieve(event.stripePriceId)

          // Priceが無効化されているか確認
          if (!stripePrice.active) {
            issues.push('Stripe Priceが無効化されている')
          }

          // 金額の整合性チェック
          if (stripePrice.unit_amount !== event.price) {
            issues.push(
              `金額不一致: DB=${event.price}円, Stripe=${stripePrice.unit_amount}円`
            )
          }

          // 通貨チェック
          if (stripePrice.currency !== 'jpy') {
            issues.push(`通貨が不正: ${stripePrice.currency}（期待値: jpy）`)
          }
        } catch (error: any) {
          if (error.code === 'resource_missing') {
            issues.push(
              `Stripe Priceが見つからない（${currentEnv}環境に存在しない可能性）`
            )
          } else if (error.type === 'StripeInvalidRequestError') {
            issues.push(`Stripe APIエラー: ${error.message}`)
          } else {
            issues.push(`予期しないエラー: ${error.message || String(error)}`)
          }
        }
      }

      if (issues.length > 0) {
        results.push({
          eventId: event.id,
          title: event.title,
          date: event.date.toISOString(),
          status: event.status,
          price: event.price,
          stripePriceId: event.stripePriceId,
          issues,
        })
      }
    }

    return NextResponse.json({
      success: true,
      environment: currentEnv,
      totalPaidEvents: paidEvents.length,
      invalidEvents: results.length,
      validEvents: paidEvents.length - results.length,
      details: results,
    })
  } catch (error) {
    console.error('Validate prices error:', error)
    return NextResponse.json(
      { error: '検証処理に失敗しました' },
      { status: 500 }
    )
  }
}
