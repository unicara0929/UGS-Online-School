import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(request: NextRequest) {
  try {
    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'ユーザーIDとロールが必要です' },
        { status: 400 }
      )
    }

    // 有効なロールかチェック
    const validRoles = ['MEMBER', 'FP', 'MANAGER', 'ADMIN']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: '無効なロールです' },
        { status: 400 }
      )
    }

    // Supabaseでユーザーのメタデータを更新
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role }
    })

    if (error) {
      console.error('Supabase user update error:', error)
      return NextResponse.json(
        { error: 'ユーザーロールの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
