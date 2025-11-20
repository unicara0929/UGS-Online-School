import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LPMeetingStatus, NotificationType, NotificationPriority } from '@prisma/client'
import { createNotification } from '@/lib/services/notification-service'
import { getAuthenticatedUser, checkRole, Roles } from '@/lib/auth/api-helpers'

/**
 * 面談予約申請
 * POST /api/lp-meetings/request
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // MEMBERロールチェック
    const { allowed, error: roleError } = checkRole(authUser!.role, [Roles.MEMBER])
    if (!allowed) return roleError!

    const { preferredDates, meetingLocation, memberNotes } = await request.json()

    // リクエストボディのmemberIdを使わず、認証ユーザーのIDを使用
    const memberId = authUser!.id

    // 面談場所のバリデーション
    if (!meetingLocation) {
      return NextResponse.json(
        { error: '面談場所を選択してください' },
        { status: 400 }
      )
    }

    // 面談場所が正しい値かチェック
    if (meetingLocation !== 'OFFLINE' && meetingLocation !== 'UGS_OFFICE') {
      return NextResponse.json(
        { error: '無効な面談場所が指定されました' },
        { status: 400 }
      )
    }

    if (!preferredDates) {
      return NextResponse.json(
        { error: '希望日時が必要です' },
        { status: 400 }
      )
    }

    // 希望日時が5つであることを確認
    if (!Array.isArray(preferredDates) || preferredDates.length !== 5) {
      return NextResponse.json(
        { error: '希望日時は5つ選択してください' },
        { status: 400 }
      )
    }

    // 希望日時が未来の日時であることを確認
    const now = new Date()
    for (const date of preferredDates) {
      const dateObj = new Date(date)
      if (isNaN(dateObj.getTime()) || dateObj <= now) {
        return NextResponse.json(
          { error: '希望日時は未来の日時を選択してください' },
          { status: 400 }
        )
      }
    }

    // 既存のアクティブな面談をチェック
    const existingMeeting = await prisma.lPMeeting.findUnique({
      where: { memberId }
    })

    if (existingMeeting && 
        existingMeeting.status !== 'COMPLETED' && 
        existingMeeting.status !== 'CANCELLED' && 
        existingMeeting.status !== 'NO_SHOW') {
      return NextResponse.json(
        { error: '既にアクティブな面談予約があります。現在の面談が完了、キャンセル、またはノーショーになるまで再申請できません。' },
        { status: 409 }
      )
    }

    // 面談予約申請を作成
    const meeting = await prisma.lPMeeting.create({
      data: {
        memberId,
        status: LPMeetingStatus.REQUESTED,
        preferredDates: preferredDates,
        meetingLocation: meetingLocation,
        memberNotes: memberNotes || null
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // 管理者に通知を送信
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    })

    for (const admin of admins) {
      await createNotification(
        admin.id,
        NotificationType.LP_MEETING_REQUESTED,
        NotificationPriority.INFO,
        'LP面談の予約申請がありました',
        `${meeting.member.name}さんからLP面談の予約申請がありました。希望日時を確認して面談を確定してください。`,
        '/dashboard/admin/lp-meetings'
      )
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        memberId: meeting.memberId,
        status: meeting.status,
        preferredDates: meeting.preferredDates,
        meetingLocation: meeting.meetingLocation,
        memberNotes: meeting.memberNotes,
        createdAt: meeting.createdAt
      }
    })
  } catch (error: any) {
    console.error('LP面談予約申請エラー:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '既にアクティブな面談予約があります' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: '面談予約申請に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 自分の面談状況を取得
 * GET /api/lp-meetings/my-meeting
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // MEMBERロールチェック
    const { allowed, error: roleError } = checkRole(authUser!.role, [Roles.MEMBER])
    if (!allowed) return roleError!

    // クエリパラメータのuserIdを使わず、認証ユーザーのIDを使用
    const userId = authUser!.id

    const meeting = await prisma.lPMeeting.findUnique({
      where: { memberId: userId },
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
        }
      }
    })

    if (!meeting) {
      return NextResponse.json({
        success: true,
        meeting: null
      })
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        memberId: meeting.memberId,
        fpId: meeting.fpId,
        status: meeting.status,
        preferredDates: meeting.preferredDates,
        meetingLocation: meeting.meetingLocation,
        scheduledAt: meeting.scheduledAt,
        completedAt: meeting.completedAt,
        cancelledAt: meeting.cancelledAt,
        meetingUrl: meeting.meetingUrl,
        meetingPlatform: meeting.meetingPlatform,
        notes: meeting.notes,
        memberNotes: meeting.memberNotes,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
        member: meeting.member,
        fp: meeting.fp
      }
    })
  } catch (error) {
    console.error('LP面談取得エラー:', error)
    return NextResponse.json(
      { error: '面談情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

