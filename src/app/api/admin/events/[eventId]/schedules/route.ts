import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdminOrManager } from '@/lib/auth/api-helpers'
import { EventScheduleStatus } from '@prisma/client'

/**
 * イベント日程一覧を取得
 * GET /api/admin/events/[eventId]/schedules
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { error: roleError } = checkAdminOrManager(user!.role)
    if (roleError) return roleError

    const { eventId } = await context.params

    const schedules = await prisma.eventSchedule.findMany({
      where: { eventId },
      orderBy: { date: 'asc' },
      include: {
        _count: {
          select: {
            registrations: true,
            externalRegistrations: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      schedules: schedules.map(schedule => ({
        id: schedule.id,
        eventId: schedule.eventId,
        date: schedule.date,
        time: schedule.time,
        location: schedule.location,
        onlineMeetingUrl: schedule.onlineMeetingUrl,
        status: schedule.status,
        attendanceCode: schedule.attendanceCode,
        registrationCount: schedule._count.registrations + schedule._count.externalRegistrations,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      }))
    })
  } catch (error) {
    console.error('日程一覧取得エラー:', error)
    return NextResponse.json(
      { success: false, error: '日程一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 新しい日程を追加
 * POST /api/admin/events/[eventId]/schedules
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { error: roleError } = checkAdminOrManager(user!.role)
    if (roleError) return roleError

    const { eventId } = await context.params
    const body = await request.json()
    const { date, time, location, onlineMeetingUrl, attendanceCode } = body

    // イベントの存在確認
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 日付のバリデーション
    if (!date) {
      return NextResponse.json(
        { success: false, error: '日付は必須です' },
        { status: 400 }
      )
    }

    const schedule = await prisma.eventSchedule.create({
      data: {
        eventId,
        date: new Date(date),
        time: time || null,
        location: location || null,
        onlineMeetingUrl: onlineMeetingUrl || null,
        attendanceCode: attendanceCode || null,
        status: EventScheduleStatus.OPEN,
      }
    })

    return NextResponse.json({
      success: true,
      schedule: {
        id: schedule.id,
        eventId: schedule.eventId,
        date: schedule.date,
        time: schedule.time,
        location: schedule.location,
        onlineMeetingUrl: schedule.onlineMeetingUrl,
        status: schedule.status,
        attendanceCode: schedule.attendanceCode,
        createdAt: schedule.createdAt,
      }
    })
  } catch (error) {
    console.error('日程追加エラー:', error)
    return NextResponse.json(
      { success: false, error: '日程の追加に失敗しました' },
      { status: 500 }
    )
  }
}
