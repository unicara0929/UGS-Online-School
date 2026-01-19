/**
 * 特定のメールアドレスの決済を修正するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/fix-user-payment.ts 4423yoshino@gmail.com --dry-run
 *   npx tsx scripts/fix-user-payment.ts kai.m0819@icloud.com
 */

import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

const email = process.argv[2]
const isDryRun = process.argv.includes('--dry-run')

async function main() {
  if (!email) {
    console.error('使用方法: npx tsx scripts/fix-user-payment.ts <email> [--dry-run]')
    process.exit(1)
  }

  console.log(`=== ${email} の決済状況を確認 ===`)
  console.log(`モード: ${isDryRun ? 'DRY RUN（確認のみ）' : '実際に修正'}`)
  console.log('')

  // 1. 外部参加者登録を確認
  const externalRegs = await prisma.externalEventRegistration.findMany({
    where: { email },
    include: {
      event: { select: { title: true } }
    }
  })

  console.log(`外部参加者登録: ${externalRegs.length}件`)
  for (const reg of externalRegs) {
    console.log(`\n--- 外部参加者登録 ---`)
    console.log(`  ID: ${reg.id}`)
    console.log(`  名前: ${reg.name}`)
    console.log(`  イベント: ${reg.event.title}`)
    console.log(`  DB決済ステータス: ${reg.paymentStatus}`)
    console.log(`  stripeSessionId: ${reg.stripeSessionId || 'なし'}`)
    console.log(`  paidAt: ${reg.paidAt || 'なし'}`)

    if (reg.stripeSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(reg.stripeSessionId)
        console.log(`  Stripe決済ステータス: ${session.payment_status}`)
        console.log(`  Stripeセッションステータス: ${session.status}`)
        console.log(`  payment_intent: ${session.payment_intent}`)
        console.log(`  amount_total: ${session.amount_total}`)

        if (session.payment_status === 'paid' && reg.paymentStatus === 'PENDING') {
          console.log(`\n  ⚠️ 不整合検出: Stripe=paid, DB=PENDING`)

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
            console.log(`  ✅ 修正完了`)
          } else {
            console.log(`  [DRY RUN] 修正をスキップ`)
          }
        }
      } catch (error: any) {
        console.error(`  Stripeエラー: ${error.message}`)
      }
    }
  }

  // 2. 内部ユーザー登録を確認
  const user = await prisma.user.findFirst({
    where: { email }
  })

  if (user) {
    const internalRegs = await prisma.eventRegistration.findMany({
      where: { userId: user.id },
      include: {
        event: { select: { title: true } }
      }
    })

    console.log(`\n内部ユーザー登録: ${internalRegs.length}件`)
    for (const reg of internalRegs) {
      console.log(`\n--- 内部ユーザー登録 ---`)
      console.log(`  ID: ${reg.id}`)
      console.log(`  イベント: ${reg.event.title}`)
      console.log(`  DB決済ステータス: ${reg.paymentStatus}`)
      console.log(`  stripeSessionId: ${reg.stripeSessionId || 'なし'}`)
      console.log(`  paidAt: ${reg.paidAt || 'なし'}`)

      if (reg.stripeSessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(reg.stripeSessionId)
          console.log(`  Stripe決済ステータス: ${session.payment_status}`)
          console.log(`  Stripeセッションステータス: ${session.status}`)

          if (session.payment_status === 'paid' && reg.paymentStatus === 'PENDING') {
            console.log(`\n  ⚠️ 不整合検出: Stripe=paid, DB=PENDING`)

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
              console.log(`  ✅ 修正完了`)
            } else {
              console.log(`  [DRY RUN] 修正をスキップ`)
            }
          }
        } catch (error: any) {
          console.error(`  Stripeエラー: ${error.message}`)
        }
      }
    }
  } else {
    console.log(`\n内部ユーザーとしては登録されていません`)
  }

  // 3. Stripeで直接検索（メールアドレスで）
  console.log(`\n--- Stripeで${email}の決済履歴を確認 ---`)
  try {
    const sessions = await stripe.checkout.sessions.list({
      customer_details: { email },
      limit: 10,
    })
    console.log(`Stripeセッション: ${sessions.data.length}件`)
    for (const session of sessions.data) {
      console.log(`  - ID: ${session.id}`)
      console.log(`    payment_status: ${session.payment_status}`)
      console.log(`    status: ${session.status}`)
      console.log(`    metadata: ${JSON.stringify(session.metadata)}`)
      console.log(`    created: ${new Date(session.created * 1000).toISOString()}`)
      console.log('')
    }
  } catch (error: any) {
    console.error(`Stripe検索エラー: ${error.message}`)
  }

  console.log('\n=== 完了 ===')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
