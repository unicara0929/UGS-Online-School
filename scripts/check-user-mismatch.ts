/**
 * SupabaseとPrismaのユーザーデータの不一致をチェックするスクリプト
 */

import { prisma } from '../src/lib/prisma'
import { supabaseAdmin } from '../src/lib/supabase'

async function checkUserMismatch() {
  try {
    console.log('🔍 ユーザーデータの不一致をチェック中...\n')

    // 1. Supabase Auth Usersを取得
    const { data: supabaseData, error: supabaseError } = await supabaseAdmin.auth.admin.listUsers()
    if (supabaseError) {
      throw new Error(`Supabase取得エラー: ${supabaseError.message}`)
    }

    // 2. Prisma Usersを取得
    const prismaUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    })

    // 3. Prisma PendingUsersを取得
    const pendingUsers = await prisma.pendingUser.findMany({
      select: {
        email: true,
        name: true,
      }
    })

    console.log('📊 サマリー:')
    console.log(`   Supabase Auth Users: ${supabaseData.users.length}名`)
    console.log(`   Prisma Users: ${prismaUsers.length}名`)
    console.log(`   Prisma Pending Users: ${pendingUsers.length}名\n`)

    // 4. マップを作成
    const supabaseMap = new Map(supabaseData.users.map(u => [u.id, u]))
    const prismaMap = new Map(prismaUsers.map(u => [u.id, u]))

    // 5. Supabaseにのみ存在
    const onlyInSupabase = supabaseData.users.filter(su => !prismaMap.has(su.id))
    if (onlyInSupabase.length > 0) {
      console.log(`❌ Supabaseにのみ存在 (${onlyInSupabase.length}名):`)
      onlyInSupabase.forEach(u => {
        console.log(`   - ${u.email} (${u.user_metadata?.name || '名前なし'}) [ID: ${u.id.substring(0, 8)}...]`)
      })
      console.log('')
    }

    // 6. Prismaにのみ存在
    const onlyInPrisma = prismaUsers.filter(pu => !supabaseMap.has(pu.id))
    if (onlyInPrisma.length > 0) {
      console.log(`❌ Prismaにのみ存在 (${onlyInPrisma.length}名):`)
      onlyInPrisma.forEach(u => {
        console.log(`   - ${u.email} (${u.name}) - ${u.role} [ID: ${u.id.substring(0, 8)}...]`)
      })
      console.log('')
    }

    // 7. 名前の不一致
    const nameMismatch: any[] = []
    supabaseData.users.forEach(su => {
      const pu = prismaMap.get(su.id)
      if (pu) {
        const supabaseName = su.user_metadata?.name || ''
        if (supabaseName !== pu.name && supabaseName !== '') {
          nameMismatch.push({
            email: su.email,
            supabaseName,
            prismaName: pu.name,
          })
        }
      }
    })

    if (nameMismatch.length > 0) {
      console.log(`⚠️  名前が不一致 (${nameMismatch.length}名):`)
      nameMismatch.forEach(u => {
        console.log(`   - ${u.email}`)
        console.log(`     Supabase: "${u.supabaseName}"`)
        console.log(`     Prisma:   "${u.prismaName}"`)
      })
      console.log('')
    }

    // 8. 正常なユーザー数
    const matching = supabaseData.users.filter(su => prismaMap.has(su.id)).length
    console.log(`✅ 両方に存在 (正常): ${matching}名\n`)

    if (onlyInSupabase.length === 0 && onlyInPrisma.length === 0 && nameMismatch.length === 0) {
      console.log('🎉 すべてのデータが一致しています！')
    } else {
      console.log('⚠️  データの不一致が見つかりました。上記の詳細を確認してください。')
    }

  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserMismatch()
