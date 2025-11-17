import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

/**
 * 休会申請 API
 * ユーザーが自分のアカウントを一時停止（休会）するためのエンドポイント
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
    const { suspensionEndDate, reason } = body

    // バリデーション: 休会期間が指定されているか
    if (!suspensionEndDate) {
      return NextResponse.json(
        { error: '休会終了日を指定してください' },
        { status: 400 }
      )
    }

    // バリデーション: 休会終了日が未来の日付か
    const endDate = new Date(suspensionEndDate)
    const now = new Date()
    if (endDate <= now) {
      return NextResponse.json(
        { error: '休会終了日は未来の日付を指定してください' },
        { status: 400 }
      )
    }

    // バリデーション: 休会期間が3ヶ月以内か
    const maxSuspensionDate = new Date()
    maxSuspensionDate.setMonth(maxSuspensionDate.getMonth() + 3)
    if (endDate > maxSuspensionDate) {
      return NextResponse.json(
        { error: '休会期間は最大3ヶ月までです' },
        { status: 400 }
      )
    }

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

    // バリデーション: 有効会員のみ休会可能
    if (user.membershipStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: '有効会員のみ休会申請が可能です' },
        { status: 400 }
      )
    }

    // Stripeサブスクリプションを一時停止
    const subscription = user.subscriptions?.[0]
    if (subscription?.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          pause_collection: {
            behavior: 'void', // 請求を完全に停止
            resumes_at: Math.floor(endDate.getTime() / 1000), // Unix timestamp
          },
        })
      } catch (stripeError) {
        console.error('Stripe subscription pause error:', stripeError)
        return NextResponse.json(
          { error: 'サブスクリプションの一時停止に失敗しました' },
          { status: 500 }
        )
      }
    }

    // 会員ステータスを SUSPENDED に更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        membershipStatus: 'SUSPENDED',
        membershipStatusChangedAt: new Date(),
        membershipStatusReason: reason || 'ユーザーによる休会申請',
        suspensionStartDate: new Date(),
        suspensionEndDate: endDate,
      }
    })

    return NextResponse.json({
      success: true,
      message: '休会申請を受け付けました',
      suspensionEndDate: endDate.toISOString(),
    })
  } catch (error) {
    console.error('Suspension API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * 休会解除 API
 * ユーザーが休会を早期解除する場合に使用
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

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

    // バリデーション: 休会中のユーザーのみ解除可能
    if (user.membershipStatus !== 'SUSPENDED') {
      return NextResponse.json(
        { error: '休会中のユーザーのみ解除が可能です' },
        { status: 400 }
      )
    }

    // Stripeサブスクリプションの一時停止を解除
    const subscription = user.subscriptions?.[0]
    if (subscription?.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          pause_collection: null, // 一時停止を解除
        })
      } catch (stripeError) {
        console.error('Stripe subscription resume error:', stripeError)
        return NextResponse.json(
          { error: 'サブスクリプションの再開に失敗しました' },
          { status: 500 }
        )
      }
    }

    // 会員ステータスを ACTIVE に戻す
    await prisma.user.update({
      where: { id: user.id },
      data: {
        membershipStatus: 'ACTIVE',
        membershipStatusChangedAt: new Date(),
        membershipStatusReason: 'ユーザーによる休会解除',
        reactivatedAt: new Date(),
        suspensionStartDate: null,
        suspensionEndDate: null,
      }
    })

    return NextResponse.json({
      success: true,
      message: '休会を解除しました',
    })
  } catch (error) {
    console.error('Suspension cancellation API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
