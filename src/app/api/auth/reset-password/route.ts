import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * パスワードリセットメールを送信
 * POST /api/auth/reset-password
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      )
    }

    // リクエストヘッダーからホスト情報を取得
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host')
    const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
    
    // 本番環境のURLを取得
    let appUrl: string
    if (process.env.NEXT_PUBLIC_APP_URL) {
      appUrl = process.env.NEXT_PUBLIC_APP_URL
    } else if (host) {
      // Vercelや本番環境の場合
      appUrl = `${protocol}://${host}`
    } else if (process.env.VERCEL_URL) {
      appUrl = `https://${process.env.VERCEL_URL}`
    } else {
      // 開発環境のフォールバック
      appUrl = 'http://localhost:3000'
    }

    const redirectUrl = `${appUrl}/reset-password`

    console.log('Password reset redirect URL:', redirectUrl)
    console.log('Host:', host, 'Protocol:', protocol)

    // パスワードリセットメールを送信（共有のSupabaseクライアントを使用）
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      console.error('Password reset error:', error)
      
      // レート制限エラーの場合（429）
      if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
        // エラーメッセージから待機時間を抽出（例: "after 13 seconds"）
        const waitTimeMatch = error.message?.match(/(\d+)\s*seconds?/i)
        const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1]) : 60
        
        return NextResponse.json(
          { 
            error: `セキュリティのため、パスワードリセットメールの送信は${waitTime}秒後に再度お試しください。`,
            code: 'RATE_LIMIT',
            waitTime
          },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        { error: 'パスワードリセットメールの送信に失敗しました', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'パスワードリセットメールを送信しました',
      redirectUrl: redirectUrl // デバッグ用
    })
  } catch (error: any) {
    console.error('Reset password API error:', error)
    return NextResponse.json(
      { error: 'パスワードリセットメールの送信に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}

