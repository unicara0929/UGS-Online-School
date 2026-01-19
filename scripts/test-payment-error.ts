import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const action = process.argv[2]
  const email = process.argv[3]

  if (!action || !email) {
    console.log('使い方:')
    console.log('  決済エラーにする: npx tsx scripts/test-payment-error.ts set <email>')
    console.log('  元に戻す:         npx tsx scripts/test-payment-error.ts reset <email>')
    console.log('')
    console.log('例: npx tsx scripts/test-payment-error.ts set test@example.com')
    return
  }

  // ユーザーを検索
  const user = await prisma.user.findUnique({
    where: { email },
    include: { subscriptions: true }
  })

  if (!user) {
    console.error(`ユーザーが見つかりません: ${email}`)
    return
  }

  if (user.subscriptions.length === 0) {
    console.error(`サブスクリプションがありません: ${email}`)
    return
  }

  const subscription = user.subscriptions[0]

  if (action === 'set') {
    // 現在のstripeSubscriptionIdを保存（リセット用）
    const originalStripeSubId = subscription.stripeSubscriptionId

    // PAST_DUEに変更 + stripeSubscriptionIdを一時的に無効化
    // これによりStripeからのステータス取得が失敗し、DBのステータスが使われる
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'PAST_DUE',
        // stripeSubscriptionIdを一時的にバックアップ形式に変更
        stripeSubscriptionId: originalStripeSubId ? `BACKUP_${originalStripeSubId}` : null
      }
    })
    console.log(`✅ ${email} のステータスを PAST_DUE に変更しました`)
    console.log(`   元のstripeSubscriptionId: ${originalStripeSubId}`)
    console.log('   → ログインして決済エラー画面を確認してください')
  } else if (action === 'reset') {
    // ACTIVEに戻す + stripeSubscriptionIdを復元
    const backedUpId = subscription.stripeSubscriptionId
    const originalId = backedUpId?.startsWith('BACKUP_')
      ? backedUpId.replace('BACKUP_', '')
      : backedUpId

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        stripeSubscriptionId: originalId
      }
    })
    console.log(`✅ ${email} のステータスを ACTIVE に戻しました`)
    console.log(`   stripeSubscriptionId を復元: ${originalId}`)
  } else {
    console.error('不明なアクション:', action)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
