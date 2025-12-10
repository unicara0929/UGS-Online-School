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

    const includeOptions = userId
      ? {
          _count: { select: { registrations: true } },
          registrations: {
            where: { userId },
            select: {
              id: true,
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
          _count: { select: { registrations: true } },
        }

    // タイムアウト設定（8秒）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('リクエストがタイムアウトしました')), 8000)
    })

    // ユーザーのロールに基づいてイベントをフィルタリング
    const userRole = authUser!.role
    const userTargetRole = USER_ROLE_TO_EVENT_TARGET_ROLE[userRole as keyof typeof USER_ROLE_TO_EVENT_TARGET_ROLE] || 'MEMBER'

    const now = new Date()

    const eventsPromise = prisma.event.findMany({
      where: {
        AND: [
          // 記録専用イベントを除外
          { isArchiveOnly: false },
          // ロールによるフィルタリング
          {
            OR: [
              { targetRoles: { has: 'ALL' } }, // 全員対象のイベント
              { targetRoles: { has: userTargetRole } }, // ユーザーのロールに一致するイベント
            ],
          },
          // ステータスフィルタリング
          {
            OR: [
              // 開催予定のイベント
              { status: 'UPCOMING' },
              // 全体MTG（isRecurring=true）で完了済み、かつ視聴期限内のイベント
              {
                AND: [
                  { isRecurring: true },
                  { status: 'COMPLETED' },
                  { attendanceDeadline: { gte: now } },
                ],
              },
            ],
          },
        ],
      },
      orderBy: { date: 'asc' },
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

      const currentParticipants =
        '_count' in event ? (event._count as { registrations: number }).registrations : 0

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
        date: event.date.toISOString(),
        time: event.time ?? '',
        type: EVENT_TYPE_MAP[typeKey] ?? 'optional', // 後方互換性のため残す
        targetRoles: (event.targetRoles || []).map(role => EVENT_TARGET_ROLE_MAP[role as keyof typeof EVENT_TARGET_ROLE_MAP]),
        attendanceType: EVENT_ATTENDANCE_TYPE_MAP[attendanceTypeKey] ?? 'optional',
        venueType: EVENT_VENUE_TYPE_MAP[venueTypeKey] ?? 'online',
        location: event.location ?? '',
        maxParticipants: event.maxParticipants ?? null,
        currentParticipants,
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
        hasAttendanceCode: !!event.attendanceCode, // コードの有無のみ（コード自体は返さない）
        attendanceDeadline: event.attendanceDeadline?.toISOString() ?? null,
        vimeoUrl: event.vimeoUrl ?? null,
        surveyUrl: event.surveyUrl ?? null,
        materialsUrl: event.materialsUrl ?? null,
        attendanceMethod: registration?.attendanceMethod ?? null,
        attendanceCompletedAt: registration?.attendanceCompletedAt?.toISOString() ?? null,
        videoWatched: registration?.videoWatched ?? false,
        surveyCompleted: registration?.surveyCompleted ?? false,
        // 全体MTG関連
        isRecurring: event.isRecurring,
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

