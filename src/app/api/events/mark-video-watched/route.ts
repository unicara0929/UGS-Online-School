import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { eventId } = body as { eventId?: string }

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'イベントIDは必須です' },
        { status: 400 }
      )
    }

    const userId = authUser!.id

    // イベント情報を取得
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        vimeoUrl: true,
        attendanceDeadline: true,
      },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // Vimeo URLが設定されているか確認
    if (!event.vimeoUrl) {
      return NextResponse.json(
        { success: false, error: 'このイベントには録画が登録されていません' },
        { status: 400 }
      )
    }

    // 期限超過チェック（ブロックせず、フラグのみ設定）
    const isOverdue = event.attendanceDeadline ? new Date() > new Date(event.attendanceDeadline) : false

    // イベント登録を確認
    const registration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    })

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'このイベントに申し込みされていません' },
        { status: 400 }
      )
    }

    // 録画視聴済みとして記録
    const now = new Date()
    const updatedRegistration = await prisma.eventRegistration.update({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
      data: {
        videoWatched: true,
        videoCompletedAt: now,
        // 期限超過の場合、フラグを設定
        ...(isOverdue && { isOverdue: true }),
      },
    })

    // 録画視聴とアンケート両方完了している場合、出席完了として記録
    if (updatedRegistration.videoWatched && updatedRegistration.surveyCompleted) {
      await prisma.eventRegistration.update({
        where: {
          userId_eventId: {
            userId,
            eventId,
          },
        },
        data: {
          attendanceMethod: 'VIDEO_SURVEY',
          attendanceCompletedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: '録画視聴とアンケート回答が完了しました！出席が確認されました。',
        attendanceCompleted: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: '録画視聴が記録されました。アンケートに回答して出席を完了してください。',
      attendanceCompleted: false,
    })
  } catch (error) {
    console.error('[MARK_VIDEO_WATCHED_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '録画視聴の記録に失敗しました' },
      { status: 500 }
    )
  }
}
