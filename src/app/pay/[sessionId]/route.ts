import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Stripeのセッション情報を取得
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session.url) {
      return NextResponse.json(
        { error: '決済リンクが見つかりません' },
        { status: 404 }
      )
    }

    // Stripeのチェックアウトページにリダイレクト
    return NextResponse.redirect(session.url)
  } catch (error) {
    console.error('決済リダイレクトエラー:', error)

    // エラーページにリダイレクト
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/checkout?error=invalid_session`
    )
  }
}
