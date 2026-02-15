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
        schedules: {
          orderBy: { date: 'asc' },
          include: {
            _count: {
              select: {
                registrations: true,
                externalRegistrations: true,
              }
            }
          }
        },
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

    // 最初のスケジュール
    const firstSchedule = event.schedules[0]

    // 申込期限チェック（日数ベース）- 全てのOPENスケジュールが期限切れの場合のみブロック
    if (event.applicationDeadlineDays !== null && event.schedules.length > 0) {
      const now = new Date()
      const hasOpenSchedule = event.schedules.some(schedule => {
        if (schedule.status !== 'OPEN') return false
        const deadline = new Date(schedule.date)
        deadline.setDate(deadline.getDate() - event.applicationDeadlineDays!)
        return now <= deadline
      })
      if (!hasOpenSchedule) {
        return NextResponse.json(
          { success: false, error: '申込期限が過ぎています' },
          { status: 410 }
        )
      }
    }

    // 現在の参加者数を計算
    const currentParticipants = event._count.registrations + event._count.externalRegistrations

    // 公開用の情報のみを返す（機密情報を除外）
    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        // 後方互換性：最初のスケジュールの情報を使用
        date: firstSchedule?.date ?? null,
        time: firstSchedule?.time ?? null,
        location: firstSchedule?.location ?? null,
        venueType: event.venueType,
        thumbnailUrl: event.thumbnailUrl,
        isPaid: event.isPaid,
        price: event.price,
        currentParticipants,
        applicationDeadlineDays: event.applicationDeadlineDays,
        status: event.status,
        externalFormFields: event.externalFormFields ?? null,
        // スケジュール一覧
        schedules: event.schedules.map(schedule => ({
          id: schedule.id,
          date: schedule.date,
          time: schedule.time,
          location: schedule.location,
          status: schedule.status,
          registrationCount: schedule._count.registrations + schedule._count.externalRegistrations,
        })),
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
