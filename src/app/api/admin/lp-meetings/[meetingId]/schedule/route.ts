import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LPMeetingStatus, MeetingPlatform, NotificationType, NotificationPriority } from '@prisma/client'
import { createNotification } from '@/lib/services/notification-service'
import { formatDateTime } from '@/lib/utils/format'

/**
 * 面談を確定（管理者）
 * POST /api/admin/lp-meetings/{meetingId}/schedule
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await context.params
    const { scheduledAt, fpId, meetingUrl, meetingPlatform, assignedBy } = await request.json()

    if (!scheduledAt || !fpId || !meetingUrl || !meetingPlatform || !assignedBy) {
      return NextResponse.json(
        { error: '確定日時、FPエイドID、面談URL、プラットフォーム、管理者IDが必要です' },
        { status: 400 }
      )
    }

    // 面談を取得
    const meeting = await prisma.lPMeeting.findUnique({
      where: { id: meetingId },
      include: {
        member: true,
        fp: true
      }
    })

    if (!meeting) {
      return NextResponse.json(
        { error: '面談が見つかりません' },
        { status: 404 }
      )
    }

    if (meeting.status !== 'REQUESTED') {
      return NextResponse.json(
        { error: 'この面談は既に確定済みまたはキャンセル済みです' },
        { status: 400 }
      )
    }

    // 希望日時に含まれているか確認
    const preferredDates = meeting.preferredDates as string[]
    const scheduledAtDate = new Date(scheduledAt).toISOString()
    const isPreferredDate = preferredDates.some(date => {
      const preferredDate = new Date(date).toISOString()
      // 日付部分のみを比較（時刻は無視）
      return preferredDate.split('T')[0] === scheduledAtDate.split('T')[0]
    })

    if (!isPreferredDate) {
      return NextResponse.json(
        { error: '確定日時は希望日時のいずれかから選択してください' },
        { status: 400 }
      )
    }

    // FPエイドが存在するか確認
    const fp = await prisma.user.findUnique({
      where: { id: fpId },
      select: { id: true, role: true }
    })

    if (!fp || fp.role !== 'FP') {
      return NextResponse.json(
        { error: 'FPエイドが見つかりません' },
        { status: 404 }
      )
    }

    // 面談を確定
    const updatedMeeting = await prisma.lPMeeting.update({
      where: { id: meetingId },
      data: {
        status: LPMeetingStatus.SCHEDULED,
        scheduledAt: new Date(scheduledAt),
        fpId,
        meetingUrl,
        meetingPlatform: meetingPlatform as MeetingPlatform,
        assignedBy
      },
      include: {
        member: true,
        fp: true
      }
    })

    // メンバーに通知を送信
    await createNotification(
      updatedMeeting.memberId,
      NotificationType.LP_MEETING_SCHEDULED,
      NotificationPriority.INFO,
      'LP面談が確定しました',
      `${formatDateTime(new Date(scheduledAt))}に${updatedMeeting.fp?.name}さんとのLP面談が確定しました。オンライン面談のURL: ${meetingUrl}`,
      '/dashboard/lp-meeting/request'
    )

    // FPエイドに通知を送信
    if (updatedMeeting.fpId) {
      await createNotification(
        updatedMeeting.fpId,
        NotificationType.LP_MEETING_SCHEDULED,
        NotificationPriority.INFO,
        'LP面談が確定しました',
        `${formatDateTime(new Date(scheduledAt))}に${updatedMeeting.member.name}さんとのLP面談が確定しました。オンライン面談のURL: ${meetingUrl}`,
        '/dashboard/lp-meeting/manage'
      )
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: updatedMeeting.id,
        memberId: updatedMeeting.memberId,
        fpId: updatedMeeting.fpId,
        status: updatedMeeting.status,
        scheduledAt: updatedMeeting.scheduledAt,
        meetingUrl: updatedMeeting.meetingUrl,
        meetingPlatform: updatedMeeting.meetingPlatform,
        member: updatedMeeting.member,
        fp: updatedMeeting.fp
      }
    })
  } catch (error: any) {
    console.error('LP面談確定エラー:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '面談が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '面談の確定に失敗しました' },
      { status: 500 }
    )
  }
}
