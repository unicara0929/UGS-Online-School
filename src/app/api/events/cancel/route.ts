import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * イベント登録キャンセルAPI
 * PENDING状態のEventRegistrationを削除する
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

    const { eventId } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { error: 'イベントIDが必要です' },
        { status: 400 }
      )
    }

    // 既存のRegistrationを確認
    const registration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId: authUser.id,
          eventId: eventId,
        },
      },
      include: {
        event: true,
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'このイベントに登録されていません' },
        { status: 404 }
      )
    }

    // 支払い済みの場合はキャンセル不可（返金処理が必要）
    if (registration.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: '支払い済みのイベントはキャンセルできません。返金処理が必要です。' },
        { status: 400 }
      )
    }

    // PENDING状態のRegistrationを削除
    await prisma.eventRegistration.delete({
      where: {
        userId_eventId: {
          userId: authUser.id,
          eventId: eventId,
        },
      },
    })

    console.log(`Event registration canceled: userId=${authUser.id}, eventId=${eventId}`)

    return NextResponse.json({
      success: true,
      message: 'イベントの申し込みをキャンセルしました',
    })
  } catch (error) {
    console.error('Event cancel error:', error)
    return NextResponse.json(
      { error: 'キャンセル処理に失敗しました' },
      { status: 500 }
    )
  }
}
