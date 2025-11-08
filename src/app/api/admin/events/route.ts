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

const EVENT_TYPE_INPUT_MAP: Record<string, 'REQUIRED' | 'OPTIONAL' | 'MANAGER_ONLY'> = {
  required: 'REQUIRED',
  optional: 'OPTIONAL',
  'manager-only': 'MANAGER_ONLY',
}

const EVENT_STATUS_INPUT_MAP: Record<string, 'UPCOMING' | 'COMPLETED' | 'CANCELLED'> = {
  upcoming: 'UPCOMING',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
}

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: 'asc' },
      include: {
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: { select: { registrations: true } },
      },
    })

    const formattedEvents = events.map((event) => {
      const typeKey = event.type as keyof typeof EVENT_TYPE_MAP
      const statusKey = event.status as keyof typeof EVENT_STATUS_MAP

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
        status: EVENT_STATUS_MAP[statusKey] ?? 'upcoming',
        currentParticipants: event._count.registrations,
        registrations: event.registrations.map((registration) => ({
          id: registration.id,
          userId: registration.userId,
          userName: registration.user?.name ?? '',
          userEmail: registration.user?.email ?? '',
          registeredAt: registration.createdAt.toISOString(),
        })),
      }
    })

    return NextResponse.json({ success: true, events: formattedEvents })
  } catch (error) {
    console.error('[ADMIN_EVENTS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'イベント情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      date,
      time,
      type = 'optional',
      isOnline = true,
      location,
      maxParticipants,
      status = 'upcoming',
    } = body || {}

    if (!title || !date) {
      return NextResponse.json(
        { success: false, error: 'title と date は必須です' },
        { status: 400 }
      )
    }

    const eventType = EVENT_TYPE_INPUT_MAP[type] ?? 'OPTIONAL'
    const eventStatus = EVENT_STATUS_INPUT_MAP[status] ?? 'UPCOMING'

    const createdEvent = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        time,
        type: eventType,
        isOnline,
        location,
        maxParticipants: maxParticipants !== undefined ? Number(maxParticipants) : null,
        status: eventStatus,
      },
    })

    return NextResponse.json({
      success: true,
      event: {
        id: createdEvent.id,
        title: createdEvent.title,
        description: createdEvent.description ?? '',
        date: createdEvent.date.toISOString(),
        time: createdEvent.time ?? '',
        type,
        isOnline: createdEvent.isOnline,
        location: createdEvent.location ?? '',
        maxParticipants: createdEvent.maxParticipants ?? null,
        status,
        currentParticipants: 0,
        registrations: [],
      },
    })
  } catch (error) {
    console.error('[ADMIN_EVENTS_POST_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'イベントの作成に失敗しました' },
      { status: 500 }
    )
  }
}

