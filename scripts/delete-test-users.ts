/**
 * テストユーザーを削除するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function deleteTestUsers() {
  try {
    console.log('🗑️  テストユーザーを削除中...\n')

    const testUserEmails = [
      'test-referrer@example.com',
      'test-referred@example.com',
      'test-fp@example.com',
      'test-member@example.com',
    ]

    for (const email of testUserEmails) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          subscriptions: true,
          referralsAsReferrer: true,
          referralsAsReferred: true,
          contracts: true,
          compensations: true,
        }
      })

      if (!user) {
        console.log(`⏭️  ${email} - 既に削除されています`)
        continue
      }

      console.log(`🔍 ${email} (${user.name}) を確認中...`)
      console.log(`   - サブスクリプション: ${user.subscriptions.length}件`)
      console.log(`   - 紹介（紹介者として）: ${user.referralsAsReferrer.length}件`)
      console.log(`   - 紹介（被紹介者として）: ${user.referralsAsReferred.length}件`)
      console.log(`   - 契約: ${user.contracts.length}件`)
      console.log(`   - 報酬: ${user.compensations.length}件`)

      // 削除（CASCADE削除により関連データも自動削除）
      await prisma.user.delete({
        where: { email }
      })

      console.log(`✅ ${email} を削除しました\n`)
    }

    console.log('🎉 テストユーザーの削除が完了しました！')

    // 最終確認
    const remainingUsers = await prisma.user.count()
    console.log(`\n📊 残りのユーザー数: ${remainingUsers}名`)

  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteTestUsers()
