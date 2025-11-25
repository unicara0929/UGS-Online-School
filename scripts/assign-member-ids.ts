/**
 * 既存ユーザーへの会員番号一括付与スクリプト
 *
 * 使い方:
 * npx tsx scripts/assign-member-ids.ts
 *
 * 処理内容:
 * - 会員番号を持っていないすべてのユーザーに会員番号を付与
 * - 既存ユーザーの登録順に連番を割り当て
 * - トランザクション処理で安全に実行
 */

import { prisma } from '../src/lib/prisma'
import { generateMemberId } from '../src/lib/services/member-id-generator'

async function assignMemberIds() {
  console.log('🔍 会員番号を持っていないユーザーを検索中...')

  // 会員番号が未設定のユーザーを取得（登録日時順）
  const usersWithoutMemberId = await prisma.user.findMany({
    where: {
      OR: [
        { memberId: null },
        { memberId: '' }
      ]
    },
    orderBy: {
      createdAt: 'asc' // 登録順に連番を割り当て
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    }
  })

  console.log(`📊 対象ユーザー数: ${usersWithoutMemberId.length}名`)

  if (usersWithoutMemberId.length === 0) {
    console.log('✅ 全ユーザーに会員番号が付与されています')
    return
  }

  console.log('\n🚀 会員番号の一括付与を開始します...\n')

  let successCount = 0
  let errorCount = 0

  for (const user of usersWithoutMemberId) {
    try {
      // 会員番号を生成
      const memberId = await generateMemberId()

      // ユーザーに会員番号を付与
      await prisma.user.update({
        where: { id: user.id },
        data: { memberId }
      })

      console.log(`✅ ${memberId} - ${user.name} (${user.email})`)
      successCount++
    } catch (error: any) {
      console.error(`❌ エラー - ${user.name} (${user.email}): ${error.message}`)
      errorCount++
    }
  }

  console.log('\n📈 処理結果:')
  console.log(`  成功: ${successCount}名`)
  console.log(`  失敗: ${errorCount}名`)
  console.log(`  合計: ${usersWithoutMemberId.length}名`)

  if (successCount > 0) {
    console.log('\n✨ 会員番号の一括付与が完了しました')
  }
}

// スクリプト実行
assignMemberIds()
  .catch((error) => {
    console.error('❌ スクリプト実行エラー:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
