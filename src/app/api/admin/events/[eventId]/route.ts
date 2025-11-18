import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

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

/**
 * イベント編集API
 * PUT /api/admin/events/[eventId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { eventId } = await params

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId が指定されていません' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      date,
      time,
      type,
      targetRoles,
      attendanceType,
      venueType,
      location,
      maxParticipants,
      status,
      isPaid,
      price,
    } = body || {}

    // 更新データを構築
    const updateData: any = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (date !== undefined) updateData.date = new Date(date)
    if (time !== undefined) updateData.time = time
    if (type !== undefined) updateData.type = EVENT_TYPE_INPUT_MAP[type] ?? 'OPTIONAL'
    if (targetRoles !== undefined) {
      updateData.targetRoles = targetRoles.map((role: string) => EVENT_TARGET_ROLE_INPUT_MAP[role] ?? 'ALL')
    }
    if (attendanceType !== undefined) {
      updateData.attendanceType = EVENT_ATTENDANCE_TYPE_INPUT_MAP[attendanceType] ?? 'OPTIONAL'
    }
    if (venueType !== undefined) {
      updateData.venueType = EVENT_VENUE_TYPE_INPUT_MAP[venueType] ?? 'ONLINE'
    }
    if (location !== undefined) updateData.location = location
    if (maxParticipants !== undefined) {
      updateData.maxParticipants = maxParticipants !== null ? Number(maxParticipants) : null
    }
    if (status !== undefined) {
      updateData.status = EVENT_STATUS_INPUT_MAP[status] ?? 'UPCOMING'
    }
    if (isPaid !== undefined) updateData.isPaid = isPaid
    if (price !== undefined) updateData.price = isPaid ? Number(price) : null

    // 有料イベントの検証
    if (isPaid && (!price || price <= 0)) {
      return NextResponse.json(
        { success: false, error: '有料イベントの場合、価格（0円より大きい金額）が必須です' },
        { status: 400 }
      )
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description ?? '',
        date: updatedEvent.date.toISOString(),
        time: updatedEvent.time ?? '',
        type: updatedEvent.type,
        targetRoles: updatedEvent.targetRoles,
        attendanceType: updatedEvent.attendanceType,
        venueType: updatedEvent.venueType,
        location: updatedEvent.location ?? '',
        maxParticipants: updatedEvent.maxParticipants ?? null,
        status: updatedEvent.status,
        isPaid: updatedEvent.isPaid,
        price: updatedEvent.price ?? null,
      },
    })
  } catch (error) {
    console.error('[ADMIN_EVENTS_PUT_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'イベントの更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * イベント削除API
 * DELETE /api/admin/events/[eventId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { eventId } = await params

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId が指定されていません' },
        { status: 400 }
      )
    }

    await prisma.event.delete({
      where: { id: eventId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN_EVENTS_DELETE_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'イベントの削除に失敗しました' },
      { status: 500 }
    )
  }
}

