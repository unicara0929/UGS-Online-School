import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LPMeetingStatus, NotificationType, NotificationPriority } from '@prisma/client'
import { createNotification } from '@/lib/services/notification-service'

/**
 * FPエイドの面談一覧を取得
 * GET /api/lp-meetings/my-scheduled
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fpId = searchParams.get('fpId')

    if (!fpId) {
      return NextResponse.json(
        { error: 'FPエイドIDが必要です' },
        { status: 400 }
      )
    }

    const meetings = await prisma.lPMeeting.findMany({
      where: {
        fpId,
        status: {
          in: ['SCHEDULED', 'COMPLETED']
        }
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      meetings: meetings.map(meeting => ({
        id: meeting.id,
        memberId: meeting.memberId,
        fpId: meeting.fpId,
        status: meeting.status,
        scheduledAt: meeting.scheduledAt,
        completedAt: meeting.completedAt,
        meetingUrl: meeting.meetingUrl,
        meetingPlatform: meeting.meetingPlatform,
        notes: meeting.notes,
        memberNotes: meeting.memberNotes,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
        member: meeting.member
      }))
    })
  } catch (error) {
    console.error('FPエイド面談一覧取得エラー:', error)
    return NextResponse.json(
      { error: '面談一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 面談完了の確認
 * POST /api/lp-meetings/{meetingId}/complete
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await context.params
    const { notes } = await request.json()

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

    if (meeting.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: 'この面談は確定されていません' },
        { status: 400 }
      )
    }

    // 面談を完了ステータスに更新
    const updatedMeeting = await prisma.lPMeeting.update({
      where: { id: meetingId },
      data: {
        status: LPMeetingStatus.COMPLETED,
        completedAt: new Date(),
        notes: notes || null
      },
      include: {
        member: true
      }
    })

    // FPPromotionApplicationのlpMeetingCompletedを更新
    try {
      await prisma.fPPromotionApplication.update({
        where: { userId: meeting.memberId },
        data: {
          lpMeetingCompleted: true
        }
      })
    } catch (error: any) {
      // FPPromotionApplicationが存在しない場合は無視（まだ申請していない場合）
      if (error.code !== 'P2025') {
        console.error('FPPromotionApplication更新エラー:', error)
      }
    }

    // メンバーに通知を送信
    await createNotification(
      updatedMeeting.memberId,
      NotificationType.LP_MEETING_COMPLETED,
      NotificationPriority.SUCCESS,
      'LP面談が完了しました',
      'FPエイド昇格の条件の一つであるLP面談が完了しました。',
      '/dashboard/promotion'
    )

    return NextResponse.json({
      success: true,
      meeting: {
        id: updatedMeeting.id,
        memberId: updatedMeeting.memberId,
        status: updatedMeeting.status,
        completedAt: updatedMeeting.completedAt,
        notes: updatedMeeting.notes
      }
    })
  } catch (error: any) {
    console.error('LP面談完了エラー:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '面談が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '面談完了の確認に失敗しました' },
      { status: 500 }
    )
  }
}

