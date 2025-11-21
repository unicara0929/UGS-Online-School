import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * POST /api/user/change-password
 * ログインユーザーのパスワードを変更
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { currentPassword, newPassword } = body

    // バリデーション
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '現在のパスワードと新しいパスワードを入力してください' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: '新しいパスワードは8文字以上で入力してください' },
        { status: 400 }
      )
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: '現在のパスワードと同じパスワードは設定できません' },
        { status: 400 }
      )
    }

    // Supabaseクライアントを作成
    const supabase = await createClient()

    // 現在のパスワードを検証するため、再認証を試みる
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser!.email,
      password: currentPassword
    })

    if (signInError) {
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 401 }
      )
    }

    // 新しいパスワードに更新
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: 'パスワードの変更に失敗しました。もう一度お試しください。' },
        { status: 500 }
      )
    }

    console.log('[PASSWORD_CHANGE] Success:', {
      userId: authUser!.id,
      email: authUser!.email,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'パスワードを変更しました'
    })
  } catch (error: any) {
    console.error('Password change API error:', error)
    return NextResponse.json(
      { error: 'パスワードの変更中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
