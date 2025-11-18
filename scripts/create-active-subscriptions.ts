import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 全ユーザーを決済済みにするスクリプト
 * subscriptionレコードがないユーザーに対して、ACTIVEなsubscriptionを作成
 */
async function createActiveSubscriptions() {
  try {
    console.log('🔍 subscriptionレコードがないユーザーを検索中...')

    // 全ユーザーを取得
    const allUsers = await prisma.user.findMany({
      include: {
        subscriptions: true,
      },
    })

    console.log(`📊 総ユーザー数: ${allUsers.length}`)

    // subscriptionがないユーザーを抽出
    const usersWithoutSubscription = allUsers.filter(
      (user) => user.subscriptions.length === 0
    )

    console.log(`⚠️  subscriptionがないユーザー数: ${usersWithoutSubscription.length}`)

    if (usersWithoutSubscription.length === 0) {
      console.log('✅ 全ユーザーが既にsubscriptionを持っています')
      return
    }

    console.log('\n📝 以下のユーザーにsubscriptionを作成します:')
    usersWithoutSubscription.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email})`)
    })

    console.log('\n🔧 subscriptionレコードを作成中...')

    // 各ユーザーにACTIVEなsubscriptionを作成
    for (const user of usersWithoutSubscription) {
      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeCustomerId: `cus_dummy_${user.id}`, // ダミーのカスタマーID
          stripeSubscriptionId: `sub_dummy_${user.id}`, // ダミーのサブスクリプションID
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年後
        },
      })

      console.log(`  ✅ ${user.name} - subscription作成完了 (ID: ${subscription.id})`)
    }

    console.log('\n✅ 全てのユーザーにsubscriptionを作成しました')
    console.log(`📊 作成数: ${usersWithoutSubscription.length}件`)
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// スクリプト実行
createActiveSubscriptions()
  .then(() => {
    console.log('\n🎉 スクリプトが正常に完了しました')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 スクリプトが失敗しました:', error)
    process.exit(1)
  })
