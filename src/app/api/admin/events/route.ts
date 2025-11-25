import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { createEventPrice } from '@/lib/services/event-price-service'

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

const EVENT_VENUE_TYPE_MAP = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  HYBRID: 'hybrid',
} as const

const EVENT_TYPE_INPUT_MAP: Record<string, 'REQUIRED' | 'OPTIONAL' | 'MANAGER_ONLY'> = {
  required: 'REQUIRED',
  optional: 'OPTIONAL',
  'manager-only': 'MANAGER_ONLY',
}

const EVENT_VENUE_TYPE_INPUT_MAP: Record<string, 'ONLINE' | 'OFFLINE' | 'HYBRID'> = {
  online: 'ONLINE',
  offline: 'OFFLINE',
  hybrid: 'HYBRID',
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
      const attendanceTypeKey = event.attendanceType as keyof typeof EVENT_ATTENDANCE_TYPE_MAP
      const statusKey = event.status as keyof typeof EVENT_STATUS_MAP
      const venueTypeKey = event.venueType as keyof typeof EVENT_VENUE_TYPE_MAP

      return {
        id: event.id,
        title: event.title,
        description: event.description ?? '',
        date: event.date.toISOString(),
        time: event.time ?? '',
        type: EVENT_TYPE_MAP[typeKey] ?? 'optional', // 後方互換性のため残す
        targetRoles: (event.targetRoles || []).map(role => EVENT_TARGET_ROLE_MAP[role as keyof typeof EVENT_TARGET_ROLE_MAP]),
        attendanceType: EVENT_ATTENDANCE_TYPE_MAP[attendanceTypeKey] ?? 'optional',
        venueType: EVENT_VENUE_TYPE_MAP[venueTypeKey] ?? 'online',
        location: event.location ?? '',
        maxParticipants: event.maxParticipants ?? null,
        status: EVENT_STATUS_MAP[statusKey] ?? 'upcoming',
        thumbnailUrl: event.thumbnailUrl ?? null,
        currentParticipants: event._count.registrations,
        // 過去イベント記録用フィールド
        summary: event.summary ?? null,
        photos: event.photos ?? [],
        materialsUrl: event.materialsUrl ?? null,
        actualParticipants: event.actualParticipants ?? null,
        actualLocation: event.actualLocation ?? null,
        adminNotes: event.adminNotes ?? null,
        isArchiveOnly: event.isArchiveOnly ?? false,
        // 出席確認関連
        vimeoUrl: event.vimeoUrl ?? null,
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
      targetRoles = [],
      attendanceType = 'optional',
      venueType = 'online',
      location,
      maxParticipants,
      status = 'upcoming',
      thumbnailUrl,
      isPaid = false,
      price,
      // 出席確認関連
      attendanceCode,
      vimeoUrl,
      surveyUrl,
      attendanceDeadline,
      // 定期開催関連
      isRecurring = false,
      recurrencePattern,
      // 過去イベント記録用
      summary,
      photos = [],
      materialsUrl,
      actualParticipants,
      actualLocation,
      adminNotes,
      isArchiveOnly = false,
    } = body || {}

    if (!title || !date) {
      return NextResponse.json(
        { success: false, error: 'title と date は必須です' },
        { status: 400 }
      )
    }

    // 有料イベントの場合、価格が必須
    if (isPaid && (!price || price <= 0)) {
      return NextResponse.json(
        { success: false, error: '有料イベントの場合、価格（0円より大きい金額）が必須です' },
        { status: 400 }
      )
    }

    const eventType = EVENT_TYPE_INPUT_MAP[type] ?? 'OPTIONAL'
    const eventTargetRoles = targetRoles.map((role: string) => EVENT_TARGET_ROLE_INPUT_MAP[role] ?? 'ALL')
    const eventAttendanceType = EVENT_ATTENDANCE_TYPE_INPUT_MAP[attendanceType] ?? 'OPTIONAL'
    const eventVenueType = EVENT_VENUE_TYPE_INPUT_MAP[venueType] ?? 'ONLINE'
    const eventStatus = EVENT_STATUS_INPUT_MAP[status] ?? 'UPCOMING'

    const createdEvent = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        time,
        type: eventType, // 後方互換性のため残す
        targetRoles: eventTargetRoles,
        attendanceType: eventAttendanceType,
        venueType: eventVenueType,
        location,
        maxParticipants: maxParticipants !== undefined ? Number(maxParticipants) : null,
        status: eventStatus,
        thumbnailUrl: thumbnailUrl || null,
        isPaid,
        price: isPaid ? Number(price) : null,
        // 出席確認関連
        attendanceCode: attendanceCode || null,
        vimeoUrl: vimeoUrl || null,
        surveyUrl: surveyUrl || null,
        attendanceDeadline: attendanceDeadline ? new Date(attendanceDeadline) : null,
        // 定期開催関連
        isRecurring,
        recurrencePattern: recurrencePattern || null,
        // 過去イベント記録用
        summary: summary || null,
        photos: photos || [],
        materialsUrl: materialsUrl || null,
        actualParticipants: actualParticipants !== undefined ? Number(actualParticipants) : null,
        actualLocation: actualLocation || null,
        adminNotes: adminNotes || null,
        isArchiveOnly,
      },
    })

    // 有料イベントの場合、Stripe Priceを作成
    if (isPaid && price) {
      try {
        await createEventPrice({
          eventId: createdEvent.id,
          eventTitle: createdEvent.title,
          price: Number(price),
        })
      } catch (stripeError) {
        console.error('Failed to create Stripe Price:', stripeError)
        // Stripe Price作成失敗時はイベントを削除してエラーを返す
        await prisma.event.delete({ where: { id: createdEvent.id } })
        return NextResponse.json(
          { success: false, error: 'Stripe決済設定の作成に失敗しました' },
          { status: 500 }
        )
      }
    }

    // 記録専用イベントでない場合のみ新着通知を作成
    if (!isArchiveOnly) {
      try {
        // EventTargetRole を UserRole に変換
        const notificationTargetRoles = eventTargetRoles
          .filter((role: string) => role !== 'ALL') // 'ALL' は除外
          .map((role: string) => {
            if (role === 'MEMBER') return 'MEMBER'
            if (role === 'FP') return 'FP'
            if (role === 'MANAGER') return 'MANAGER'
            return 'MEMBER'
          })

        // 'ALL' が含まれている場合は全ロールを対象にする
        const finalTargetRoles = eventTargetRoles.includes('ALL')
          ? [] // 空配列 = 全員向け
          : notificationTargetRoles

        console.log('[EVENT_NOTIFICATION_DEBUG]', {
          eventTitle: title,
          eventTargetRoles,
          notificationTargetRoles,
          finalTargetRoles,
          hasAll: eventTargetRoles.includes('ALL')
        })

        await prisma.systemNotification.create({
          data: {
            type: 'EVENT_ADDED',
            title: `新しいイベント「${title}」が追加されました`,
            contentType: 'EVENT',
            contentId: createdEvent.id,
            targetUrl: `/dashboard/events/${createdEvent.id}`,
            targetRoles: finalTargetRoles,
          }
        })
      } catch (notificationError) {
        console.error('[EVENT_NOTIFICATION_ERROR]', notificationError)
        // 通知作成失敗はイベント作成の失敗とはしない（ログのみ）
      }
    }

    const attendanceTypeKey = createdEvent.attendanceType as keyof typeof EVENT_ATTENDANCE_TYPE_MAP
    const venueTypeKey = createdEvent.venueType as keyof typeof EVENT_VENUE_TYPE_MAP

    return NextResponse.json({
      success: true,
      event: {
        id: createdEvent.id,
        title: createdEvent.title,
        description: createdEvent.description ?? '',
        date: createdEvent.date.toISOString(),
        time: createdEvent.time ?? '',
        type, // 後方互換性のため残す
        targetRoles: (createdEvent.targetRoles || []).map(role => EVENT_TARGET_ROLE_MAP[role as keyof typeof EVENT_TARGET_ROLE_MAP]),
        attendanceType: EVENT_ATTENDANCE_TYPE_MAP[attendanceTypeKey] ?? 'optional',
        venueType: EVENT_VENUE_TYPE_MAP[venueTypeKey] ?? 'online',
        location: createdEvent.location ?? '',
        maxParticipants: createdEvent.maxParticipants ?? null,
        status,
        thumbnailUrl: createdEvent.thumbnailUrl ?? null,
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

