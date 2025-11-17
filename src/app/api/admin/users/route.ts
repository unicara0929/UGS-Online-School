import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 1. Prismaからすべてのユーザーを取得（こちらをベースにする）
    const prismaUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    })

    // 2. Supabaseからユーザー一覧を取得（認証情報用）
    const { data: supabaseData, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error('Supabase users fetch error:', error)
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 3. Supabaseユーザーのマップを作成
    const supabaseMap = new Map(
      supabaseData.users.map(user => [user.id, user])
    )

    // 4. Prismaユーザーをベースに、Supabaseの認証情報を付加
    const formattedUsers = prismaUsers.map((prismaUser) => {
      const supabaseUser = supabaseMap.get(prismaUser.id)

      return {
        id: prismaUser.id,
        email: prismaUser.email,
        created_at: supabaseUser?.created_at || prismaUser.createdAt.toISOString(),
        email_confirmed_at: supabaseUser?.email_confirmed_at || null,
        last_sign_in_at: supabaseUser?.last_sign_in_at || null,
        role: prismaUser.role, // Prismaのロールが正
        raw_user_meta_data: {
          name: prismaUser.name, // Prismaの名前が正
          role: prismaUser.role,
        },
        // データ整合性フラグ
        hasSupabaseAuth: !!supabaseUser,
      }
    })

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
