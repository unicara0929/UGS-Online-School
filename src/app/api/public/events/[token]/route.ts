import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 公開イベント情報取得（認証不要）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'トークンが必要です' },
        { status: 400 }
      )
    }

    // トークンでイベントを検索
    const event = await prisma.event.findUnique({
      where: {
        externalRegistrationToken: token,
      },
      include: {
        _count: {
          select: {
            registrations: true,
            externalRegistrations: true,
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 外部参加が許可されていない場合
    if (!event.allowExternalParticipation) {
      return NextResponse.json(
        { success: false, error: 'このイベントは外部参加を受け付けていません' },
        { status: 403 }
      )
    }

    // イベントがキャンセル済みの場合
    if (event.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'このイベントはキャンセルされました' },
        { status: 410 }
      )
    }

    // 申込期限チェック
    if (event.applicationDeadline && new Date(event.applicationDeadline) < new Date()) {
      return NextResponse.json(
        { success: false, error: '申込期限が過ぎています' },
        { status: 410 }
      )
    }

    // 現在の参加者数を計算
    const currentParticipants = event._count.registrations + event._count.externalRegistrations

    // 定員チェック
    const isFull = event.maxParticipants !== null && currentParticipants >= event.maxParticipants

    // 公開用の情報のみを返す（機密情報を除外）
    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        venueType: event.venueType,
        thumbnailUrl: event.thumbnailUrl,
        isPaid: event.isPaid,
        price: event.price,
        maxParticipants: event.maxParticipants,
        currentParticipants,
        isFull,
        applicationDeadline: event.applicationDeadline,
        status: event.status,
      }
    })
  } catch (error) {
    console.error('Error fetching public event:', error)
    return NextResponse.json(
      { success: false, error: 'イベント情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
