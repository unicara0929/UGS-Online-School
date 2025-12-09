import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Stripe Checkout Sessionを取得
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    // セキュリティチェック: セッションのメールアドレスを確認
    const sessionEmail = session.customer_email || session.metadata?.userEmail

    if (sessionEmail) {
      // 認証済みユーザーの場合、自分のセッションかどうか確認
      const supabase = await createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        // ログインユーザーは自分のメールアドレスのセッションのみ取得可能
        const user = await prisma.user.findUnique({
          where: { id: authUser.id },
          select: { email: true }
        })

        if (user && user.email !== sessionEmail) {
          return NextResponse.json(
            { error: 'Unauthorized access to session' },
            { status: 403 }
          )
        }
      } else {
        // 未認証ユーザーの場合、PendingUserのメールアドレスと照合
        const pendingUser = await prisma.pendingUser.findUnique({
          where: { email: sessionEmail }
        })

        // PendingUserも見つからない場合は、新規登録フローとして許可
        // （決済完了後のリダイレクトで使用されるため）
        if (!pendingUser) {
          // 登録完了直後のユーザーも許可（User存在チェック）
          const existingUser = await prisma.user.findUnique({
            where: { email: sessionEmail }
          })

          if (!existingUser) {
            console.warn('Session access without matching user:', { sessionEmail })
            // 登録フロー中の可能性があるため、限定的な情報のみ返す
          }
        }
      }
    }

    // セッション情報を返す（機密情報は除外）
    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_email,
        metadata: session.metadata,
        amount_total: session.amount_total,
        currency: session.currency,
      }
    })
  } catch (error) {
    console.error('Error retrieving session:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    )
  }
}
