/**
 * 決済済みなのにPENDINGのままになっている登録を修正するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/fix-pending-payments.ts --dry-run  # 確認のみ
 *   npx tsx scripts/fix-pending-payments.ts            # 実際に修正
 */

import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

const isDryRun = process.argv.includes('--dry-run')

async function main() {
  console.log('=== 決済済みPENDING登録の修正スクリプト ===')
  console.log(`モード: ${isDryRun ? 'DRY RUN（確認のみ）' : '実際に修正'}`)
  console.log('')

  // 1. PENDING状態の外部参加者登録を取得
  const pendingExternalRegistrations = await prisma.externalEventRegistration.findMany({
    where: {
      paymentStatus: 'PENDING',
      stripeSessionId: { not: null }
    },
    include: {
      event: { select: { title: true } }
    }
  })

  console.log(`PENDING状態の外部参加者登録: ${pendingExternalRegistrations.length}件`)

  for (const reg of pendingExternalRegistrations) {
    console.log(`\n--- 外部参加者: ${reg.name} (${reg.email}) ---`)
    console.log(`  イベント: ${reg.event.title}`)
    console.log(`  stripeSessionId: ${reg.stripeSessionId}`)

    if (!reg.stripeSessionId) continue

    try {
      // Stripeセッションを確認
      const session = await stripe.checkout.sessions.retrieve(reg.stripeSessionId)
      console.log(`  Stripe決済ステータス: ${session.payment_status}`)
      console.log(`  Stripeセッションステータス: ${session.status}`)

      if (session.payment_status === 'paid') {
        console.log(`  → 決済済み。DBを更新します。`)

        if (!isDryRun) {
          await prisma.externalEventRegistration.update({
            where: { id: reg.id },
            data: {
              paymentStatus: 'PAID',
              stripePaymentIntentId: session.payment_intent as string,
              paidAmount: session.amount_total || 0,
              paidAt: new Date(),
            }
          })
          console.log(`  ✅ 更新完了`)
        } else {
          console.log(`  [DRY RUN] 更新をスキップ`)
        }
      } else {
        console.log(`  → 未決済のためスキップ`)
      }
    } catch (error: any) {
      console.error(`  ❌ エラー: ${error.message}`)
    }
  }

  // 2. PENDING状態の内部ユーザー登録を取得
  const pendingRegistrations = await prisma.eventRegistration.findMany({
    where: {
      paymentStatus: 'PENDING',
      stripeSessionId: { not: null }
    },
    include: {
      event: { select: { title: true } },
      user: { select: { name: true, email: true } }
    }
  })

  console.log(`\n\nPENDING状態の内部ユーザー登録: ${pendingRegistrations.length}件`)

  for (const reg of pendingRegistrations) {
    console.log(`\n--- 内部ユーザー: ${reg.user.name} (${reg.user.email}) ---`)
    console.log(`  イベント: ${reg.event.title}`)
    console.log(`  stripeSessionId: ${reg.stripeSessionId}`)

    if (!reg.stripeSessionId) continue

    try {
      // Stripeセッションを確認
      const session = await stripe.checkout.sessions.retrieve(reg.stripeSessionId)
      console.log(`  Stripe決済ステータス: ${session.payment_status}`)
      console.log(`  Stripeセッションステータス: ${session.status}`)

      if (session.payment_status === 'paid') {
        console.log(`  → 決済済み。DBを更新します。`)

        if (!isDryRun) {
          await prisma.eventRegistration.update({
            where: { id: reg.id },
            data: {
              paymentStatus: 'PAID',
              stripePaymentIntentId: session.payment_intent as string,
              paidAmount: session.amount_total || 0,
              paidAt: new Date(),
            }
          })
          console.log(`  ✅ 更新完了`)
        } else {
          console.log(`  [DRY RUN] 更新をスキップ`)
        }
      } else {
        console.log(`  → 未決済のためスキップ`)
      }
    } catch (error: any) {
      console.error(`  ❌ エラー: ${error.message}`)
    }
  }

  console.log('\n=== 完了 ===')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
