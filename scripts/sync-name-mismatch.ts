/**
 * 名前の不一致を修正するスクリプト
 */

import { prisma } from '../src/lib/prisma'
import { supabaseAdmin } from '../src/lib/supabase'

async function syncNameMismatch() {
  try {
    console.log('🔄 名前の不一致を修正中...\n')

    const email = 'suzuki@gouto.co.jp'

    // Prismaからユーザー情報を取得
    const prismaUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    })

    if (!prismaUser) {
      console.log(`❌ ${email} が見つかりません`)
      return
    }

    console.log(`📝 Prismaのユーザー情報:`)
    console.log(`   - ID: ${prismaUser.id}`)
    console.log(`   - Email: ${prismaUser.email}`)
    console.log(`   - Name: ${prismaUser.name}`)
    console.log(`   - Role: ${prismaUser.role}\n`)

    // Supabaseのユーザー情報を取得
    const { data: supabaseUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(prismaUser.id)

    if (fetchError || !supabaseUser) {
      console.log(`❌ Supabaseユーザーの取得に失敗: ${fetchError?.message}`)
      return
    }

    const currentSupabaseName = supabaseUser.user.user_metadata?.name || ''
    console.log(`📝 Supabaseの現在の名前: "${currentSupabaseName}"`)
    console.log(`📝 Prismaの名前: "${prismaUser.name}"\n`)

    if (currentSupabaseName === prismaUser.name) {
      console.log('✅ 既に同期されています')
      return
    }

    // Supabaseのuser_metadataを更新
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      prismaUser.id,
      {
        user_metadata: {
          ...supabaseUser.user.user_metadata,
          name: prismaUser.name,
          role: prismaUser.role,
        }
      }
    )

    if (updateError) {
      console.log(`❌ Supabaseの更新に失敗: ${updateError.message}`)
      return
    }

    console.log(`✅ Supabaseの名前を更新しました: "${currentSupabaseName}" → "${prismaUser.name}"`)
    console.log(`✅ ロールも同期しました: ${prismaUser.role}\n`)

    console.log('🎉 名前の不一致が修正されました！')

  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

syncNameMismatch()
