import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Supabaseからユーザー一覧を取得
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error('Supabase users fetch error:', error)
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    // Prismaからすべてのユーザーのロールを取得
    const prismaUsers = await prisma.user.findMany({
      select: {
        id: true,
        role: true,
      }
    })

    // SupabaseユーザーIDとPrismaロールのマップを作成
    const roleMap = new Map(prismaUsers.map(user => [user.id, user.role]))

    // ユーザー情報を整形（Prismaのロールを優先）
    const formattedUsers = users.users.map((user) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      // Prismaのロールを優先、存在しない場合はuser_metadataのロール、それもなければMEMBER
      role: roleMap.get(user.id) || user.user_metadata?.role || 'MEMBER',
      raw_user_meta_data: user.user_metadata || {},
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
