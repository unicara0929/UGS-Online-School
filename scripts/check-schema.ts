// データベーススキーマ確認用のスクリプト
import { prisma } from '../src/lib/prisma'

async function checkSchema() {
  try {
    console.log('📊 データベーススキーマ確認中...\n')

    // 新しいテーブルの存在確認
    try {
      const referralCount = await prisma.referral.count()
      console.log(`✅ referrals: テーブル存在確認 (レコード数: ${referralCount})`)
    } catch (error: any) {
      console.log(`❌ referrals: テーブルが見つかりません - ${error.message}`)
    }

    try {
      const contractCount = await prisma.contract.count()
      console.log(`✅ contracts: テーブル存在確認 (レコード数: ${contractCount})`)
    } catch (error: any) {
      console.log(`❌ contracts: テーブルが見つかりません - ${error.message}`)
    }

    try {
      const notificationCount = await prisma.notification.count()
      console.log(`✅ notifications: テーブル存在確認 (レコード数: ${notificationCount})`)
    } catch (error: any) {
      console.log(`❌ notifications: テーブルが見つかりません - ${error.message}`)
    }

    try {
      const promotionCount = await prisma.promotionApplication.count()
      console.log(`✅ promotion_applications: テーブル存在確認 (レコード数: ${promotionCount})`)
    } catch (error: any) {
      console.log(`❌ promotion_applications: テーブルが見つかりません - ${error.message}`)
    }

    // usersテーブルの新しいカラム確認
    try {
      const user = await prisma.user.findFirst({
        select: {
          id: true,
          email: true,
          referralCode: true,
          bankAccount: true
        }
      })
      console.log(`\n✅ usersテーブル: referralCode, bankAccountカラムが存在します`)
      if (user) {
        console.log(`   サンプルユーザー: ${user.email}, referralCode: ${user.referralCode || 'null'}`)
      }
    } catch (error: any) {
      console.log(`❌ usersテーブルの確認に失敗: ${error.message}`)
    }

    console.log('\n✨ スキーマ確認完了！')
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSchema()

