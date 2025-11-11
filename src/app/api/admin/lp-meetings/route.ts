import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LPMeetingStatus } from '@prisma/client'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 予約申請一覧を取得（管理者）
 * GET /api/admin/lp-meetings
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) return adminError!
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as LPMeetingStatus | null
    const fpId = searchParams.get('fpId')
    const memberId = searchParams.get('memberId')

    const where: any = {}
    if (status) {
      where.status = status
    }
    if (fpId) {
      where.fpId = fpId
    }
    if (memberId) {
      where.memberId = memberId
    }

    const meetings = await prisma.lPMeeting.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        fp: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assigner: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 統計情報を取得
    const total = await prisma.lPMeeting.count()
    const requested = await prisma.lPMeeting.count({ where: { status: 'REQUESTED' } })
    const scheduled = await prisma.lPMeeting.count({ where: { status: 'SCHEDULED' } })
    const completed = await prisma.lPMeeting.count({ where: { status: 'COMPLETED' } })
    const cancelled = await prisma.lPMeeting.count({ where: { status: 'CANCELLED' } })

    return NextResponse.json({
      success: true,
      meetings: meetings.map(meeting => ({
        id: meeting.id,
        memberId: meeting.memberId,
        fpId: meeting.fpId,
        status: meeting.status,
        preferredDates: meeting.preferredDates,
        scheduledAt: meeting.scheduledAt,
        completedAt: meeting.completedAt,
        cancelledAt: meeting.cancelledAt,
        meetingUrl: meeting.meetingUrl,
        meetingPlatform: meeting.meetingPlatform,
        notes: meeting.notes,
        memberNotes: meeting.memberNotes,
        assignedBy: meeting.assignedBy,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
        member: meeting.member,
        fp: meeting.fp,
        assigner: meeting.assigner
      })),
      statistics: {
        total,
        requested,
        scheduled,
        completed,
        cancelled
      }
    })
  } catch (error) {
    console.error('LP面談一覧取得エラー:', error)
    return NextResponse.json(
      { error: '面談一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

