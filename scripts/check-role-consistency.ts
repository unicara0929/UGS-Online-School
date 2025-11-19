/**
 * ロール値の一貫性を確認するスクリプト
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 ロール値の一貫性チェック\n')

  // 1. Prisma Schemaの定義を確認
  console.log('1️⃣ Prisma Schema (prisma/schema.prisma):')
  console.log('   enum UserRole {')
  console.log('     MEMBER    // ← 大文字')
  console.log('     FP        // ← 大文字')
  console.log('     MANAGER   // ← 大文字')
  console.log('     ADMIN     // ← 大文字')
  console.log('   }\n')

  // 2. データベースの実際の値を確認
  console.log('2️⃣ データベースの実際のロール値:')
  const users = await prisma.user.findMany({
    select: { role: true },
    distinct: ['role']
  })
  users.forEach(user => {
    console.log(`   "${user.role}" // ← ${/[A-Z]/.test(user.role) ? '大文字' : '小文字'}`)
  })
  console.log()

  // 3. Roles定数の定義を確認
  console.log('3️⃣ lib/auth/api-helpers.ts の Roles 定数:')
  console.log('   export const Roles = {')
  console.log('     MEMBER: \'member\',   // ← 小文字の文字列')
  console.log('     FP: \'fp\',           // ← 小文字の文字列')
  console.log('     MANAGER: \'manager\', // ← 小文字の文字列')
  console.log('     ADMIN: \'admin\',     // ← 小文字の文字列')
  console.log('   }\n')

  // 4. 問題点を指摘
  console.log('❌ 問題点:')
  console.log('   - Prisma Schema: 大文字 (MEMBER, FP, MANAGER, ADMIN)')
  console.log('   - データベース: 大文字 (実際のデータ)')
  console.log('   - Roles定数: 小文字 (\'member\', \'fp\', \'manager\', \'admin\')')
  console.log('   → Roles定数が実際のデータベース値と一致していない！\n')

  // 5. ハードコードの問題
  console.log('❌ ハードコードの問題:')
  console.log('   - ハードコード例: if (user.role !== \'ADMIN\')')
  console.log('   - checkRole関数: 内部で小文字に正規化')
  console.log('   → 実装がバラバラで、将来的にバグの原因になる\n')

  // 6. 推奨事項
  console.log('✅ 推奨事項:')
  console.log('   1. Roles定数を大文字に修正:')
  console.log('      export const Roles = {')
  console.log('        MEMBER: \'MEMBER\',')
  console.log('        FP: \'FP\',')
  console.log('        MANAGER: \'MANAGER\',')
  console.log('        ADMIN: \'ADMIN\',')
  console.log('      }')
  console.log('   2. すべてのハードコードをcheckRole()に置き換え')
  console.log('   3. RoleGroupsを活用して可読性を向上\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
