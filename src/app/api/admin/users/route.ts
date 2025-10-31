import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

    // ユーザー情報を整形
    const formattedUsers = users.users.map((user) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      role: user.user_metadata?.role || 'MEMBER',
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
