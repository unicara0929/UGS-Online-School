import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EVENT_TYPE_MAP = {
  REQUIRED: 'required',
  OPTIONAL: 'optional',
  MANAGER_ONLY: 'manager-only',
} as const

const EVENT_STATUS_MAP = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const includeOptions = userId
      ? {
          _count: { select: { registrations: true } },
          registrations: {
            where: { userId },
            select: { id: true },
            take: 1, // 1件だけ取得すれば十分
          },
        }
      : {
          _count: { select: { registrations: true } },
        }

    // タイムアウト設定（8秒）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('リクエストがタイムアウトしました')), 8000)
    })

    const eventsPromise = prisma.event.findMany({
      orderBy: { date: 'asc' },
      include: includeOptions,
      take: 100, // 最大100件に制限
    })

    const events = await Promise.race([eventsPromise, timeoutPromise]) as Awaited<typeof eventsPromise>

    const formattedEvents = events.map((event) => {
      const typeKey = event.type as keyof typeof EVENT_TYPE_MAP
      const statusKey = event.status as keyof typeof EVENT_STATUS_MAP

      const currentParticipants =
        '_count' in event ? event._count.registrations : 0

      const isRegistered =
        'registrations' in event
          ? Array.isArray(event.registrations) &&
            event.registrations.length > 0
          : false

      return {
        id: event.id,
        title: event.title,
        description: event.description ?? '',
        date: event.date.toISOString(),
        time: event.time ?? '',
        type: EVENT_TYPE_MAP[typeKey] ?? 'optional',
        isOnline: event.isOnline,
        location: event.location ?? '',
        maxParticipants: event.maxParticipants ?? null,
        currentParticipants,
        status: EVENT_STATUS_MAP[statusKey] ?? 'upcoming',
        isRegistered,
      }
    })

    return NextResponse.json({ success: true, events: formattedEvents })
  } catch (error: any) {
    console.error('[EVENTS_GET_ERROR]', error)
    
    if (error.message?.includes('タイムアウト')) {
      return NextResponse.json(
        { success: false, error: 'リクエストがタイムアウトしました。しばらく待ってから再度お試しください。' },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'イベントの取得に失敗しました' },
      { status: 500 }
    )
  }
}

