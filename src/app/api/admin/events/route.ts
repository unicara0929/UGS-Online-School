import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

const EVENT_TYPE_MAP = {
  REQUIRED: 'required',
  OPTIONAL: 'optional',
  MANAGER_ONLY: 'manager-only',
} as const

const EVENT_TARGET_ROLE_MAP = {
  MEMBER: 'member',
  FP: 'fp',
  MANAGER: 'manager',
  ALL: 'all',
} as const

const EVENT_ATTENDANCE_TYPE_MAP = {
  REQUIRED: 'required',
  OPTIONAL: 'optional',
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

const EVENT_TARGET_ROLE_INPUT_MAP: Record<string, 'MEMBER' | 'FP' | 'MANAGER' | 'ALL'> = {
  member: 'MEMBER',
  fp: 'FP',
  manager: 'MANAGER',
  all: 'ALL',
}

const EVENT_ATTENDANCE_TYPE_INPUT_MAP: Record<string, 'REQUIRED' | 'OPTIONAL'> = {
  required: 'REQUIRED',
  optional: 'OPTIONAL',
}

const EVENT_STATUS_INPUT_MAP: Record<string, 'UPCOMING' | 'COMPLETED' | 'CANCELLED'> = {
  upcoming: 'UPCOMING',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
}

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

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
      const targetRoleKey = event.targetRole as keyof typeof EVENT_TARGET_ROLE_MAP
      const attendanceTypeKey = event.attendanceType as keyof typeof EVENT_ATTENDANCE_TYPE_MAP
      const statusKey = event.status as keyof typeof EVENT_STATUS_MAP

      return {
        id: event.id,
        title: event.title,
        description: event.description ?? '',
        date: event.date.toISOString(),
        time: event.time ?? '',
        type: EVENT_TYPE_MAP[typeKey] ?? 'optional', // 後方互換性のため残す
        targetRole: EVENT_TARGET_ROLE_MAP[targetRoleKey] ?? 'all',
        attendanceType: EVENT_ATTENDANCE_TYPE_MAP[attendanceTypeKey] ?? 'optional',
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
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const {
      title,
      description,
      date,
      time,
      type = 'optional', // 後方互換性のため残す
      targetRole = 'all',
      attendanceType = 'optional',
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
    const eventTargetRole = EVENT_TARGET_ROLE_INPUT_MAP[targetRole] ?? 'ALL'
    const eventAttendanceType = EVENT_ATTENDANCE_TYPE_INPUT_MAP[attendanceType] ?? 'OPTIONAL'
    const eventStatus = EVENT_STATUS_INPUT_MAP[status] ?? 'UPCOMING'

    const createdEvent = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        time,
        type: eventType, // 後方互換性のため残す
        targetRole: eventTargetRole,
        attendanceType: eventAttendanceType,
        isOnline,
        location,
        maxParticipants: maxParticipants !== undefined ? Number(maxParticipants) : null,
        status: eventStatus,
      },
    })

    const targetRoleKey = createdEvent.targetRole as keyof typeof EVENT_TARGET_ROLE_MAP
    const attendanceTypeKey = createdEvent.attendanceType as keyof typeof EVENT_ATTENDANCE_TYPE_MAP

    return NextResponse.json({
      success: true,
      event: {
        id: createdEvent.id,
        title: createdEvent.title,
        description: createdEvent.description ?? '',
        date: createdEvent.date.toISOString(),
        time: createdEvent.time ?? '',
        type, // 後方互換性のため残す
        targetRole: EVENT_TARGET_ROLE_MAP[targetRoleKey] ?? 'all',
        attendanceType: EVENT_ATTENDANCE_TYPE_MAP[attendanceTypeKey] ?? 'optional',
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

