import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

/**
 * 退会申請 API
 * ユーザーが自分のアカウントを退会（サブスクリプションキャンセル）するためのエンドポイント
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { reason, immediate } = body

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        subscriptions: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // バリデーション: TERMINATED や EXPIRED は退会申請不可
    if (user.membershipStatus === 'TERMINATED' || user.membershipStatus === 'EXPIRED') {
      return NextResponse.json(
        { error: 'このアカウントは退会申請ができません' },
        { status: 400 }
      )
    }

    // Stripeサブスクリプションをキャンセル
    const subscription = user.subscriptions?.[0]
    if (subscription?.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
          // immediate=true の場合は即座にキャンセル、falseの場合は期間終了時にキャンセル
          invoice_now: false,
          prorate: immediate ? true : false,
        })
      } catch (stripeError) {
        console.error('Stripe subscription cancellation error:', stripeError)
        return NextResponse.json(
          { error: 'サブスクリプションのキャンセルに失敗しました' },
          { status: 500 }
        )
      }
    }

    // 会員ステータスを CANCELED に更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        membershipStatus: 'CANCELED',
        membershipStatusChangedAt: new Date(),
        membershipStatusReason: 'ユーザーによる退会申請',
        canceledAt: new Date(),
        cancellationReason: reason || '理由未記入',
      }
    })

    return NextResponse.json({
      success: true,
      message: immediate
        ? '退会処理が完了しました'
        : '退会申請を受け付けました。契約期間終了時に退会となります',
    })
  } catch (error) {
    console.error('Cancellation API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
