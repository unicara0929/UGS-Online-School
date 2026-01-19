import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

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

/**
 * イベント詳細取得API
 * GET /api/events/[eventId]
 *
 * 指定したイベントの詳細情報を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { eventId } = await params

    // イベント情報を取得
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: { select: { registrations: true, externalRegistrations: true } },
        schedules: {
          orderBy: { date: 'asc' },
          include: {
            _count: {
              select: {
                registrations: true,
                externalRegistrations: true,
              }
            }
          }
        },
        registrations: {
          where: { userId: authUser!.id },
          select: {
            id: true,
            scheduleId: true,
            paymentStatus: true,
            paidAt: true,
            attendanceMethod: true,
            attendanceCompletedAt: true,
            videoWatched: true,
            surveyCompleted: true,
            participationIntent: true,
            participationIntentAt: true,
          },
          take: 1,
        },
        mtgExemptions: {
          where: { userId: authUser!.id },
          select: {
            id: true,
            status: true,
            reason: true,
            adminNotes: true,
            reviewedAt: true,
            createdAt: true,
          },
          take: 1,
        },
        // 内部アンケートの存在確認
        eventSurvey: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 権限チェック: ユーザーのロールがイベントの対象ロールに含まれているか
    const userRole = authUser!.role as 'MEMBER' | 'FP' | 'MANAGER' | 'ADMIN'

    // ADMINは全イベントにアクセス可能
    if (userRole !== 'ADMIN') {
      const canAccess =
        event.targetRoles.includes('ALL') ||
        event.targetRoles.some(role => role === userRole)

      if (!canAccess) {
        return NextResponse.json(
          { success: false, error: 'このイベントにアクセスする権限がありません' },
          { status: 403 }
        )
      }
    }

    const typeKey = event.type as keyof typeof EVENT_TYPE_MAP
    const attendanceTypeKey = event.attendanceType as keyof typeof EVENT_ATTENDANCE_TYPE_MAP
    const statusKey = event.status as keyof typeof EVENT_STATUS_MAP
    const venueTypeKey = event.venueType as keyof typeof EVENT_VENUE_TYPE_MAP

    const currentParticipants = event._count.registrations + event._count.externalRegistrations

    const isRegistered = event.registrations.length > 0
    const registration = event.registrations.length > 0 ? event.registrations[0] : null
    const exemption = event.mtgExemptions.length > 0 ? event.mtgExemptions[0] : null

    // 最初のスケジュール（後方互換性用）
    const firstSchedule = event.schedules[0]
    // 登録しているスケジュール
    const registeredSchedule = registration?.scheduleId
      ? event.schedules.find(s => s.id === registration.scheduleId)
      : null

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description ?? '',
        // 後方互換性：最初のスケジュールの日付を使用
        date: firstSchedule?.date.toISOString() ?? null,
        time: firstSchedule?.time ?? '',
        type: EVENT_TYPE_MAP[typeKey] ?? 'optional',
        targetRoles: (event.targetRoles || []).map(
          (role) => EVENT_TARGET_ROLE_MAP[role as keyof typeof EVENT_TARGET_ROLE_MAP]
        ),
        attendanceType: EVENT_ATTENDANCE_TYPE_MAP[attendanceTypeKey] ?? 'optional',
        venueType: EVENT_VENUE_TYPE_MAP[venueTypeKey] ?? 'online',
        location: firstSchedule?.location ?? '',
        currentParticipants,
        status: EVENT_STATUS_MAP[statusKey] ?? 'upcoming',
        thumbnailUrl: event.thumbnailUrl ?? null,
        isRegistered,
        // 有料イベント関連
        isPaid: event.isPaid,
        price: event.price ?? null,
        paymentStatus: registration?.paymentStatus ?? null,
        // オンライン参加URL（登録スケジュールのURLを使用）
        onlineMeetingUrl: registeredSchedule?.onlineMeetingUrl ?? firstSchedule?.onlineMeetingUrl ?? null,
        // 出席確認関連（参加コードは全体MTGのみで使用）
        hasAttendanceCode: event.isRecurring && event.schedules.some(s => !!s.attendanceCode),
        // 期限設定（日数ベース）
        applicationDeadlineDays: event.applicationDeadlineDays ?? null,
        attendanceDeadlineDays: event.attendanceDeadlineDays ?? null,
        vimeoUrl: event.vimeoUrl ?? null,
        surveyUrl: event.surveyUrl ?? null,
        hasInternalSurvey: !!(event.eventSurvey && event.eventSurvey.isActive), // 内部アンケートが設定されているか
        attendanceMethod: registration?.attendanceMethod ?? null,
        attendanceCompletedAt: registration?.attendanceCompletedAt?.toISOString() ?? null,
        videoWatched: registration?.videoWatched ?? false,
        surveyCompleted: registration?.surveyCompleted ?? false,
        // 過去イベント記録用
        summary: event.summary ?? null,
        photos: event.photos ?? [],
        materialsUrl: event.materialsUrl ?? null,
        // 定期開催（全体MTG）判定用
        isRecurring: event.isRecurring,
        // 参加意思（全体MTG用）
        participationIntent: registration?.participationIntent ?? 'UNDECIDED',
        participationIntentAt: registration?.participationIntentAt?.toISOString() ?? null,
        // 欠席申請情報
        exemption: exemption ? {
          id: exemption.id,
          status: exemption.status,
          reason: exemption.reason,
          adminNotes: exemption.adminNotes,
          reviewedAt: exemption.reviewedAt?.toISOString() ?? null,
          createdAt: exemption.createdAt.toISOString(),
        } : null,
        // 登録済みスケジュール情報
        registeredScheduleId: registration?.scheduleId ?? null,
        registeredSchedule: registeredSchedule ? {
          id: registeredSchedule.id,
          date: registeredSchedule.date.toISOString(),
          time: registeredSchedule.time ?? '',
          location: registeredSchedule.location ?? '',
          onlineMeetingUrl: registeredSchedule.onlineMeetingUrl ?? null,
          hasAttendanceCode: !!registeredSchedule.attendanceCode,
        } : null,
        // 日程一覧
        schedules: event.schedules.map(schedule => ({
          id: schedule.id,
          date: schedule.date.toISOString(),
          time: schedule.time ?? '',
          location: schedule.location ?? '',
          onlineMeetingUrl: schedule.onlineMeetingUrl ?? null,
          status: schedule.status,
          hasAttendanceCode: !!schedule.attendanceCode,
          registrationCount: schedule._count.registrations + schedule._count.externalRegistrations,
        })),
        // 外部参加者設定
        allowExternalParticipation: event.allowExternalParticipation,
        externalRegistrationToken: event.externalRegistrationToken ?? null,
      },
    })
  } catch (error) {
    console.error('[EVENT_DETAIL_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'イベント情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
