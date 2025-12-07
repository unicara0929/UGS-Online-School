import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

export async function GET(request: NextRequest) {
  // 認証チェック
  const { user: authUser, error: authError } = await getAuthenticatedUser(request)
  if (authError) return authError

  // 管理者権限チェック
  const { error: adminError } = checkAdmin(authUser!.role)
  if (adminError) return adminError

  try {
    // 1. Prismaからすべてのユーザーを取得（こちらをベースにする）
    const prismaUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        membershipStatus: true,
        memberId: true,
        createdAt: true,
      }
    })

    // 2. Supabaseからユーザー一覧を取得（認証情報用）
    // ページネーションで全ユーザーを取得（デフォルトは50件のみ）
    let allSupabaseUsers: any[] = []
    let page = 1
    const perPage = 1000

    while (true) {
      const { data: supabaseData, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      })

      if (error) {
        console.error('Supabase users fetch error:', error)
        return NextResponse.json(
          { error: 'ユーザー情報の取得に失敗しました' },
          { status: 500 }
        )
      }

      if (!supabaseData.users || supabaseData.users.length === 0) {
        break
      }

      allSupabaseUsers = allSupabaseUsers.concat(supabaseData.users)

      if (supabaseData.users.length < perPage) {
        break
      }

      page++
    }

    // 3. Supabaseユーザーのマップを作成
    const supabaseMap = new Map(
      allSupabaseUsers.map(user => [user.id, user])
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
        membershipStatus: prismaUser.membershipStatus, // 会員ステータス
        memberId: prismaUser.memberId, // 会員番号
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
