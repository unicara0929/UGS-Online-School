// データベーススキーマ確認用のスクリプト
import { prisma } from '../src/lib/prisma'

async function checkSchema() {
  try {
    console.log('📊 データベーススキーマ確認中...\n')

    // 新しいテーブルの存在確認
    const tables = [
      { name: 'referrals', model: prisma.referral },
      { name: 'contracts', model: prisma.contract },
      { name: 'notifications', model: prisma.notification },
      { name: 'promotion_applications', model: prisma.promotionApplication }
    ]

    for (const { name, model } of tables) {
      try {
        const count = await model.count()
        console.log(`✅ ${name}: テーブル存在確認 (レコード数: ${count})`)
      } catch (error: any) {
        console.log(`❌ ${name}: テーブルが見つかりません - ${error.message}`)
      }
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

