import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { sendCancellationChatworkNotification } from '@/lib/chatwork'
import { calculateContractEndDate, hasPassedMinimumContractPeriod } from '@/lib/utils/contract-period'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { reason, otherReason, continuationOption } = body

    if (!reason || !continuationOption) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    // 認証されたユーザー自身の情報を使用
    const userId = authUser!.id
    const email = authUser!.email

    // ユーザー情報をPrismaから取得（名前、登録日、サブスクリプション）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        createdAt: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    const name = user?.name || email
    const isWithinMinimumPeriod = !hasPassedMinimumContractPeriod(user.createdAt)
    const contractEndDate = calculateContractEndDate(user.createdAt)

    // 退会申請をデータベースに保存
    const cancelRequest = await prisma.cancelRequest.create({
      data: {
        userId,
        name,
        email,
        reason,
        otherReason: otherReason || null,
        continuationOption,
        isScheduled: isWithinMinimumPeriod,
        contractEndDate: isWithinMinimumPeriod ? contractEndDate : null,
        status: 'PENDING'
      }
    })

    console.log('退会申請を受け付けました:', {
      id: cancelRequest.id,
      userId,
      name,
      email,
      reason,
      continuationOption,
      isWithinMinimumPeriod,
      contractEndDate: isWithinMinimumPeriod ? contractEndDate.toISOString() : null,
      submittedAt: cancelRequest.createdAt.toISOString()
    })

    // Chatwork通知を送信
    try {
      // 紹介者名を取得
      const cancelReferral = await prisma.referral.findFirst({
        where: { referredId: userId },
        select: { referrer: { select: { name: true } } },
      })
      await sendCancellationChatworkNotification({
        userName: name,
        email,
        referrerName: cancelReferral?.referrer?.name,
        cancelledAt: new Date(),
        reason: reason + (otherReason ? `（${otherReason}）` : ''),
        registeredAt: user.createdAt,
        isWithinMinimumPeriod: isWithinMinimumPeriod,
      })
    } catch (chatworkError) {
      console.error('Chatwork通知の送信に失敗:', chatworkError)
      // 通知失敗でも退会申請処理は続行
    }

    // Stripeサブスクリプションのキャンセル予約を設定
    const subscription = user.subscriptions?.[0]
    if (subscription?.stripeSubscriptionId) {
      try {
        if (isWithinMinimumPeriod) {
          // 6ヶ月未満：契約満了日（6ヶ月後）でキャンセル
          // cancel_at はUnixタイムスタンプ（秒）
          const cancelAtTimestamp = Math.floor(contractEndDate.getTime() / 1000)
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at: cancelAtTimestamp
          })
          console.log('Stripeサブスクリプションを契約満了日でキャンセル予約:', {
            subscriptionId: subscription.stripeSubscriptionId,
            cancelAt: contractEndDate.toISOString()
          })
        } else {
          // 6ヶ月以上経過：次の請求期間終了時にキャンセル
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true
          })
          console.log('Stripeサブスクリプションを期間終了時にキャンセル予約:', {
            subscriptionId: subscription.stripeSubscriptionId
          })
        }

        // サブスクリプションのステータスを更新
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            cancelRequestedAt: new Date(),
            cancelAt: isWithinMinimumPeriod ? contractEndDate : null
          }
        })
      } catch (stripeError) {
        console.error('Stripeサブスクリプションのキャンセル予約に失敗:', stripeError)
        // エラーでも退会申請自体は受け付ける（管理者が後で対応可能）
      }
    }

    // ユーザーの会員ステータスを「退会予定」に更新
    await prisma.user.update({
      where: { id: userId },
      data: {
        membershipStatus: 'CANCELLATION_PENDING',
        membershipStatusChangedAt: new Date(),
        membershipStatusReason: `退会申請: ${reason}${otherReason ? ` - ${otherReason}` : ''}`,
        cancellationReason: reason + (otherReason ? `: ${otherReason}` : '')
      }
    })
    console.log('ユーザーの会員ステータスを退会予定に更新:', userId)

    // 6ヶ月未満の場合：申請は受け付けるが、解約予約として扱う
    if (isWithinMinimumPeriod) {
      const formattedDate = contractEndDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      return NextResponse.json({
        success: true,
        isScheduled: true,
        contractEndDate: contractEndDate.toISOString(),
        message: `退会申請を受け付けました。ご登録から6ヶ月間は契約が継続される期間となっております。契約の解除日は ${formattedDate} となりますので、ご確認ください。`
      })
    }

    // 6ヶ月以上経過：次の請求期間終了時にキャンセル
    return NextResponse.json({
      success: true,
      isScheduled: false,
      message: '退会申請を受け付けました。現在の請求期間終了時に退会となります。'
    })
  } catch (error) {
    console.error('退会申請エラー:', error)
    return NextResponse.json(
      { error: '退会申請の処理に失敗しました' },
      { status: 500 }
    )
  }
}

