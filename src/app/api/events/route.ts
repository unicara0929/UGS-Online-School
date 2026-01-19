import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// NEW判定の日数
const NEW_BADGE_DAYS = 7

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

// ユーザーロールをEventTargetRoleにマッピング
const USER_ROLE_TO_EVENT_TARGET_ROLE = {
  MEMBER: 'MEMBER',
  FP: 'FP',
  MANAGER: 'MANAGER',
  ADMIN: 'ALL', // 管理者は全イベントにアクセス可能
} as const

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const category = searchParams.get('category') // MTG, REGULAR, TRAINING

    const includeOptions = userId
      ? {
          _count: { select: { registrations: true, externalRegistrations: true } },
          schedules: {
            orderBy: { date: 'asc' as const },
            include: {
              _count: {
                select: { registrations: true, externalRegistrations: true }
              }
            }
          },
          registrations: {
            where: { userId },
            select: {
              id: true,
              scheduleId: true,
              paymentStatus: true,
              paidAt: true,
              attendanceMethod: true,
              attendanceCompletedAt: true,
              videoWatched: true,
              surveyCompleted: true,
            },
            take: 1, // 1件だけ取得すれば十分
          },
        }
      : {
          _count: { select: { registrations: true, externalRegistrations: true } },
          schedules: {
            orderBy: { date: 'asc' as const },
            include: {
              _count: {
                select: { registrations: true, externalRegistrations: true }
              }
            }
          },
        }

    // タイムアウト設定（8秒）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('リクエストがタイムアウトしました')), 8000)
    })

    // ユーザーのロールに基づいてイベントをフィルタリング
    const userRole = authUser!.role
    const userTargetRole = USER_ROLE_TO_EVENT_TARGET_ROLE[userRole as keyof typeof USER_ROLE_TO_EVENT_TARGET_ROLE] || 'MEMBER'
    const isAdmin = userRole === 'ADMIN'

    const now = new Date()

    // ロールフィルターを構築（管理者は全イベント表示）
    const roleFilter = isAdmin
      ? {}
      : userRole === 'MEMBER'
        ? {
            OR: [
              // 全員対象イベント（ただし全体MTGは除外）
              { AND: [{ targetRoles: { has: 'ALL' as const } }, { isRecurring: false }] },
              { AND: [{ targetRoles: { has: 'ALL' as const } }, { isRecurring: null }] },
              // ユーザーのロールに一致するイベント
              { targetRoles: { has: userTargetRole as 'MEMBER' | 'FP' | 'MANAGER' | 'ALL' } },
            ],
          }
        : {
            OR: [
              // 全員対象イベント
              { targetRoles: { has: 'ALL' as const } },
              // ユーザーのロールに一致するイベント
              { targetRoles: { has: userTargetRole as 'MEMBER' | 'FP' | 'MANAGER' | 'ALL' } },
            ],
          }

    const eventsPromise = prisma.event.findMany({
      where: {
        // 記録専用イベントを除外
        isArchiveOnly: false,
        // カテゴリフィルター（指定されている場合）
        ...(category ? { eventCategory: category as 'MTG' | 'REGULAR' | 'TRAINING' } : {}),
        // ロールによるフィルタリング
        ...roleFilter,
        // ステータスフィルタリング
        OR: [
          // 開催予定のイベント
          { status: 'UPCOMING' },
          // 完了済みイベントで動画またはアンケートが設定されている
          {
            status: 'COMPLETED',
            OR: [
              { vimeoUrl: { not: null } },
              { surveyUrl: { not: null } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: includeOptions,
      take: 100, // 最大100件に制限
    })

    const events = await Promise.race([eventsPromise, timeoutPromise]) as Awaited<typeof eventsPromise>

    // ユーザーのイベント閲覧履歴を取得
    const viewedEventIds = userId
      ? (await prisma.userContentView.findMany({
          where: {
            userId,
            contentType: 'EVENT',
          },
          select: { contentId: true },
        })).map((v) => v.contentId)
      : []

    // NEW判定の基準日時
    const newBadgeThreshold = new Date()
    newBadgeThreshold.setDate(newBadgeThreshold.getDate() - NEW_BADGE_DAYS)

    const formattedEvents = events.map((event) => {
      const typeKey = event.type as keyof typeof EVENT_TYPE_MAP
      const attendanceTypeKey = event.attendanceType as keyof typeof EVENT_ATTENDANCE_TYPE_MAP
      const statusKey = event.status as keyof typeof EVENT_STATUS_MAP
      const venueTypeKey = event.venueType as keyof typeof EVENT_VENUE_TYPE_MAP

      // スケジュール情報
      const schedules = 'schedules' in event ? event.schedules : []
      const firstSchedule = schedules[0]

      // 全登録者数を計算
      const totalRegistrations =
        '_count' in event
          ? (event._count as { registrations: number; externalRegistrations: number }).registrations +
            (event._count as { registrations: number; externalRegistrations: number }).externalRegistrations
          : 0

      const isRegistered =
        'registrations' in event
          ? Array.isArray(event.registrations) &&
            event.registrations.length > 0
          : false

      const registration =
        'registrations' in event && Array.isArray(event.registrations) && event.registrations.length > 0
          ? event.registrations[0]
          : null

      // NEW判定: 7日以内に更新され、かつユーザーがまだ閲覧していない
      const isNew = event.updatedAt >= newBadgeThreshold && !viewedEventIds.includes(event.id)

      return {
        id: event.id,
        title: event.title,
        description: event.description ?? '',
        // 後方互換性：最初のスケジュールの日付を使用
        date: firstSchedule?.date?.toISOString() ?? null,
        time: firstSchedule?.time ?? '',
        type: EVENT_TYPE_MAP[typeKey] ?? 'optional', // 後方互換性のため残す
        targetRoles: (event.targetRoles || []).map(role => EVENT_TARGET_ROLE_MAP[role as keyof typeof EVENT_TARGET_ROLE_MAP]),
        attendanceType: EVENT_ATTENDANCE_TYPE_MAP[attendanceTypeKey] ?? 'optional',
        venueType: EVENT_VENUE_TYPE_MAP[venueTypeKey] ?? 'online',
        location: firstSchedule?.location ?? '',
        currentParticipants: totalRegistrations,
        status: EVENT_STATUS_MAP[statusKey] ?? 'upcoming',
        thumbnailUrl: event.thumbnailUrl ?? null,
        isRegistered,
        isNew, // 新着判定
        updatedAt: event.updatedAt.toISOString(),
        // 有料イベント関連
        isPaid: event.isPaid,
        price: event.price ?? null,
        paymentStatus: registration?.paymentStatus ?? null,
        // 出席確認関連
        // 参加コードは全体MTG（isRecurring）のみで使用
        hasAttendanceCode: event.isRecurring && schedules.some((s: any) => !!s.attendanceCode),
        applicationDeadlineDays: event.applicationDeadlineDays ?? null,
        attendanceDeadlineDays: event.attendanceDeadlineDays ?? null,
        vimeoUrl: event.vimeoUrl ?? null,
        surveyUrl: event.surveyUrl ?? null,
        materialsUrl: event.materialsUrl ?? null,
        attendanceMethod: registration?.attendanceMethod ?? null,
        attendanceCompletedAt: registration?.attendanceCompletedAt?.toISOString() ?? null,
        videoWatched: registration?.videoWatched ?? false,
        surveyCompleted: registration?.surveyCompleted ?? false,
        // 全体MTG関連
        isRecurring: event.isRecurring,
        // スケジュール一覧
        schedules: schedules.map((schedule: any) => ({
          id: schedule.id,
          date: schedule.date?.toISOString() ?? null,
          time: schedule.time ?? '',
          location: schedule.location ?? '',
          status: schedule.status,
          registrationCount: (schedule._count?.registrations ?? 0) + (schedule._count?.externalRegistrations ?? 0),
        })),
      }
    })

    return NextResponse.json({ success: true, events: formattedEvents })
  } catch (error: any) {
    console.error('[EVENTS_GET_ERROR]', error)
    
    if (error.message?.includes('タイムアウト')) {
      return NextResponse.json(
        { success: false, error: 'リクエストがタイムアウトしました。しばらく待ってから再度お試しください。' },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'イベントの取得に失敗しました' },
      { status: 500 }
    )
  }
}

