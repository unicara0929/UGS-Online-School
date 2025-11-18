/**
 * ユーザーのロール値を確認・修正するスクリプト
 * 小文字のロール値を大文字に修正
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 ユーザーロール値のチェックを開始...\n')

  // すべてのユーザーを取得
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    }
  })

  console.log(`✅ 総ユーザー数: ${users.length}名\n`)

  // ロールの統計
  const roleStats = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('📈 ロール別統計:')
  Object.entries(roleStats).forEach(([role, count]) => {
    console.log(`  ${role}: ${count}名`)
  })
  console.log()

  // 小文字のロールを検出
  const invalidRoles = users.filter(user => {
    const role = user.role
    // 正しいロール（大文字）
    const validRoles = ['MEMBER', 'FP', 'MANAGER', 'ADMIN']
    return !validRoles.includes(role)
  })

  if (invalidRoles.length === 0) {
    console.log('✅ すべてのロール値が正しい形式です（大文字）')
    return
  }

  console.log(`⚠️  不正なロール値を持つユーザー: ${invalidRoles.length}名\n`)

  invalidRoles.forEach(user => {
    console.log(`  - ${user.email} (${user.name}): "${user.role}"`)
  })
  console.log()

  // 修正処理
  console.log('🔧 修正を開始します...\n')

  const roleMapping: Record<string, string> = {
    'member': 'MEMBER',
    'fp': 'FP',
    'manager': 'MANAGER',
    'admin': 'ADMIN',
  }

  let fixedCount = 0
  let skipCount = 0

  for (const user of invalidRoles) {
    const newRole = roleMapping[user.role.toLowerCase()]

    if (newRole) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: newRole as any }
        })
        console.log(`  ✅ ${user.email}: "${user.role}" → "${newRole}"`)
        fixedCount++
      } catch (error) {
        console.error(`  ❌ ${user.email}: 修正失敗`, error)
        skipCount++
      }
    } else {
      console.log(`  ⚠️  ${user.email}: 不明なロール "${user.role}" - スキップ`)
      skipCount++
    }
  }

  console.log()
  console.log('📊 修正結果:')
  console.log(`  - 修正成功: ${fixedCount}名`)
  console.log(`  - スキップ: ${skipCount}名`)
  console.log()
  console.log('✅ 処理完了')
}

main()
  .catch((error) => {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
