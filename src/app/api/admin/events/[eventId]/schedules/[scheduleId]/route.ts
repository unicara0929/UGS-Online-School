import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdminOrManager } from '@/lib/auth/api-helpers'
import { EventScheduleStatus } from '@prisma/client'

/**
 * 日程を更新
 * PUT /api/admin/events/[eventId]/schedules/[scheduleId]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ eventId: string; scheduleId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { error: roleError } = checkAdminOrManager(user!.role)
    if (roleError) return roleError

    const { eventId, scheduleId } = await context.params
    const body = await request.json()
    const { date, time, location, onlineMeetingUrl, status, attendanceCode } = body

    // 日程の存在確認
    const existingSchedule = await prisma.eventSchedule.findFirst({
      where: {
        id: scheduleId,
        eventId: eventId,
      }
    })

    if (!existingSchedule) {
      return NextResponse.json(
        { success: false, error: '日程が見つかりません' },
        { status: 404 }
      )
    }

    // ステータスのバリデーション
    if (status && !Object.values(EventScheduleStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: '無効なステータスです' },
        { status: 400 }
      )
    }

    const schedule = await prisma.eventSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(time !== undefined && { time: time || null }),
        ...(location !== undefined && { location: location || null }),
        ...(onlineMeetingUrl !== undefined && { onlineMeetingUrl: onlineMeetingUrl || null }),
        ...(status !== undefined && { status }),
        ...(attendanceCode !== undefined && { attendanceCode: attendanceCode || null }),
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
        updatedAt: schedule.updatedAt,
      }
    })
  } catch (error) {
    console.error('日程更新エラー:', error)
    return NextResponse.json(
      { success: false, error: '日程の更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 日程を削除
 * DELETE /api/admin/events/[eventId]/schedules/[scheduleId]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ eventId: string; scheduleId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { error: roleError } = checkAdminOrManager(user!.role)
    if (roleError) return roleError

    const { eventId, scheduleId } = await context.params

    // 日程の存在確認と登録者数チェック
    const existingSchedule = await prisma.eventSchedule.findFirst({
      where: {
        id: scheduleId,
        eventId: eventId,
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

    if (!existingSchedule) {
      return NextResponse.json(
        { success: false, error: '日程が見つかりません' },
        { status: 404 }
      )
    }

    // 登録者がいる場合は警告
    const totalRegistrations = existingSchedule._count.registrations + existingSchedule._count.externalRegistrations
    if (totalRegistrations > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `この日程には${totalRegistrations}名の登録者がいます。先に登録を解除してください。`
        },
        { status: 400 }
      )
    }

    await prisma.eventSchedule.delete({
      where: { id: scheduleId }
    })

    return NextResponse.json({
      success: true,
      message: '日程を削除しました'
    })
  } catch (error) {
    console.error('日程削除エラー:', error)
    return NextResponse.json(
      { success: false, error: '日程の削除に失敗しました' },
      { status: 500 }
    )
  }
}
