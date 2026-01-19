import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 動画視聴位置を取得
 * GET /api/events/video-progress?eventId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'イベントIDが必要です' },
        { status: 400 }
      )
    }

    const registration = await prisma.eventRegistration.findFirst({
      where: {
        userId: user!.id,
        eventId,
      },
      select: {
        id: true,
        videoProgress: true,
        videoWatched: true,
      },
    })

    return NextResponse.json({
      success: true,
      videoProgress: registration?.videoProgress ?? 0,
      videoWatched: registration?.videoWatched ?? false,
    })
  } catch (error) {
    console.error('Get video progress error:', error)
    return NextResponse.json(
      { success: false, error: '視聴位置の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 動画視聴位置を保存
 * POST /api/events/video-progress
 * Body: { eventId: string, progress: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    const body = await request.json()
    const { eventId, progress } = body

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'イベントIDが必要です' },
        { status: 400 }
      )
    }

    if (typeof progress !== 'number' || progress < 0) {
      return NextResponse.json(
        { success: false, error: '無効な視聴位置です' },
        { status: 400 }
      )
    }

    // 登録が存在するか確認
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        userId: user!.id,
        eventId,
      },
    })

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'イベント登録が見つかりません' },
        { status: 404 }
      )
    }

    // 既に視聴完了している場合は更新しない
    if (registration.videoWatched) {
      return NextResponse.json({
        success: true,
        message: '既に視聴完了しています',
      })
    }

    // 視聴位置を更新
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        videoProgress: progress,
      },
    })

    return NextResponse.json({
      success: true,
      message: '視聴位置を保存しました',
    })
  } catch (error) {
    console.error('Save video progress error:', error)
    return NextResponse.json(
      { success: false, error: '視聴位置の保存に失敗しました' },
      { status: 500 }
    )
  }
}
