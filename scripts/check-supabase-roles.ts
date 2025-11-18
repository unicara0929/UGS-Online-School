/**
 * Supabase認証メタデータのロール値を確認・修正するスクリプト
 */

import { supabaseAdmin } from '@/lib/supabase'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 Supabase認証メタデータのロール値チェックを開始...\n')

  // Supabaseからすべてのユーザーを取得
  const { data: supabaseData, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) {
    console.error('❌ Supabaseユーザーの取得に失敗:', error)
    return
  }

  console.log(`✅ 総Supabaseユーザー数: ${supabaseData.users.length}名\n`)

  // Prismaユーザーを取得（正しいロール情報）
  const prismaUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    }
  })

  const prismaUserMap = new Map(prismaUsers.map(u => [u.id, u]))

  console.log('🔍 Supabase vs Prisma ロール比較:\n')

  let mismatchCount = 0
  const mismatches: Array<{
    id: string
    email: string
    supabaseRole: string | undefined
    prismaRole: string
  }> = []

  for (const supabaseUser of supabaseData.users) {
    const prismaUser = prismaUserMap.get(supabaseUser.id)
    const supabaseRole = supabaseUser.user_metadata?.role || supabaseUser.raw_user_meta_data?.role

    if (!prismaUser) {
      console.log(`⚠️  ${supabaseUser.email}: Prismaに存在しない (Supabaseのみ)`)
      continue
    }

    // ロールの比較
    if (supabaseRole && supabaseRole !== prismaUser.role) {
      console.log(`❌ ${supabaseUser.email}:`)
      console.log(`   Supabase: "${supabaseRole}"`)
      console.log(`   Prisma:   "${prismaUser.role}" (正)`)
      mismatchCount++
      mismatches.push({
        id: supabaseUser.id,
        email: supabaseUser.email,
        supabaseRole: supabaseRole,
        prismaRole: prismaUser.role,
      })
    } else if (!supabaseRole) {
      console.log(`⚠️  ${supabaseUser.email}: Supabaseにロール情報なし (Prisma: ${prismaUser.role})`)
    } else {
      console.log(`✅ ${supabaseUser.email}: "${prismaUser.role}" (一致)`)
    }
  }

  console.log()
  console.log(`📊 不一致: ${mismatchCount}名\n`)

  if (mismatches.length === 0) {
    console.log('✅ すべてのロール値が一致しています')
    return
  }

  // 修正処理
  console.log('🔧 Supabaseメタデータの修正を開始します...\n')

  let fixedCount = 0
  let errorCount = 0

  for (const mismatch of mismatches) {
    try {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        mismatch.id,
        {
          user_metadata: {
            role: mismatch.prismaRole,
          }
        }
      )

      if (updateError) {
        console.error(`❌ ${mismatch.email}: 修正失敗`, updateError)
        errorCount++
      } else {
        console.log(`✅ ${mismatch.email}: "${mismatch.supabaseRole}" → "${mismatch.prismaRole}"`)
        fixedCount++
      }
    } catch (error) {
      console.error(`❌ ${mismatch.email}: エラー`, error)
      errorCount++
    }
  }

  console.log()
  console.log('📊 修正結果:')
  console.log(`  - 修正成功: ${fixedCount}名`)
  console.log(`  - エラー: ${errorCount}名`)
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
