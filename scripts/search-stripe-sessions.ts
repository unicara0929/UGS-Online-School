/**
 * Stripeの決済セッションを検索するスクリプト
 */

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

async function main() {
  console.log('=== Stripe決済セッション検索 ===\n')

  // 決済済みセッションを取得
  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
  })

  console.log(`取得したセッション数: ${sessions.data.length}件\n`)

  // 決済済み（paid）のものを表示
  console.log('=== 決済済みセッション ===')
  let paidCount = 0
  for (const session of sessions.data) {
    if (session.payment_status === 'paid') {
      paidCount++
      console.log('---')
      console.log('ID:', session.id)
      console.log('Email:', session.customer_email || session.customer_details?.email)
      console.log('Type:', session.metadata?.type || session.mode)
      console.log('Payment Status:', session.payment_status)
      console.log('Amount:', session.amount_total)
      console.log('Created:', new Date(session.created * 1000).toISOString())
      console.log('Metadata:', JSON.stringify(session.metadata))
    }
  }

  if (paidCount === 0) {
    console.log('決済済みのセッションが見つかりませんでした')
  } else {
    console.log(`\n決済済み: ${paidCount}件`)
  }

  // 渡邉さん・牧野さんのメール検索
  console.log('\n=== 渡邉さん・牧野さんのメール検索 ===')
  const targetEmails = ['4423yoshino', 'kai.m0819', '渡邉', '牧野']
  let found = false

  for (const session of sessions.data) {
    const email = (session.customer_email || session.customer_details?.email || '').toLowerCase()
    for (const target of targetEmails) {
      if (email.includes(target.toLowerCase())) {
        found = true
        console.log('---')
        console.log('Found email:', email)
        console.log('Session ID:', session.id)
        console.log('Payment Status:', session.payment_status)
        console.log('Created:', new Date(session.created * 1000).toISOString())
      }
    }
  }

  if (!found) {
    console.log('該当するセッションが見つかりませんでした')
  }

  // イベント関連の全セッションを表示
  console.log('\n=== イベント関連セッション（全件） ===')
  for (const session of sessions.data) {
    if (session.metadata?.type === 'external-event' || session.metadata?.type === 'event') {
      console.log('---')
      console.log('ID:', session.id)
      console.log('Email:', session.customer_email || session.customer_details?.email)
      console.log('Type:', session.metadata?.type)
      console.log('Payment Status:', session.payment_status)
      console.log('Status:', session.status)
      console.log('Created:', new Date(session.created * 1000).toISOString())
    }
  }
}

main().catch(console.error)
