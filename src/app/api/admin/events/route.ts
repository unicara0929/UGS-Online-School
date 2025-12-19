import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { createEventPrice } from '@/lib/services/event-price-service'
import {
  EVENT_TYPE_MAP,
  EVENT_TARGET_ROLE_MAP,
  EVENT_ATTENDANCE_TYPE_MAP,
  EVENT_STATUS_MAP,
  EVENT_VENUE_TYPE_MAP,
  EVENT_TYPE_INPUT_MAP,
  EVENT_VENUE_TYPE_INPUT_MAP,
  EVENT_TARGET_ROLE_INPUT_MAP,
  EVENT_ATTENDANCE_TYPE_INPUT_MAP,
  EVENT_STATUS_INPUT_MAP,
} from '@/lib/constants/event-enums'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const events = await prisma.event.findMany({
      orderBy: { date: 'asc' },
      include: {
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                memberId: true,
              },
            },
          },
        },
        _count: { select: { registrations: true } },
      },
    })

    // 全体MTGの免除申請を一括取得
    const mtgEventIds = events.filter(e => e.isRecurring).map(e => e.id)
    const exemptions = mtgEventIds.length > 0
      ? await prisma.mtgExemption.findMany({
          where: { eventId: { in: mtgEventIds } },
          select: {
            userId: true,
            eventId: true,
            status: true,
            reason: true,
          },
        })
      : []

    // イベントごとの免除申請をマップ化
    const exemptionsByEvent = new Map<string, Map<string, { status: string; reason: string | null }>>()
    exemptions.forEach(e => {
      if (!exemptionsByEvent.has(e.eventId)) {
        exemptionsByEvent.set(e.eventId, new Map())
      }
      exemptionsByEvent.get(e.eventId)!.set(e.userId, { status: e.status, reason: e.reason })
    })

    const formattedEvents = events.map((event) => {
      const typeKey = event.type as keyof typeof EVENT_TYPE_MAP
      const attendanceTypeKey = event.attendanceType as keyof typeof EVENT_ATTENDANCE_TYPE_MAP
      const statusKey = event.status as keyof typeof EVENT_STATUS_MAP
      const venueTypeKey = event.venueType as keyof typeof EVENT_VENUE_TYPE_MAP

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
        status: EVENT_STATUS_MAP[statusKey] ?? 'upcoming',
        thumbnailUrl: event.thumbnailUrl ?? null,
        currentParticipants: event._count.registrations,
        // 過去イベント記録用フィールド
        summary: event.summary ?? null,
        photos: event.photos ?? [],
        materialsUrl: event.materialsUrl ?? null,
        actualParticipants: event.actualParticipants ?? null,
        actualLocation: event.actualLocation ?? null,
        adminNotes: event.adminNotes ?? null,
        isArchiveOnly: event.isArchiveOnly ?? false,
        // 出席確認関連
        attendanceCode: event.attendanceCode ?? null,
        vimeoUrl: event.vimeoUrl ?? null,
        surveyUrl: event.surveyUrl ?? null,
        applicationDeadline: event.applicationDeadline?.toISOString() ?? null,
        attendanceDeadline: event.attendanceDeadline?.toISOString() ?? null,
        // 全体MTGフラグ
        isRecurring: event.isRecurring ?? false,
        registrations: event.registrations.map((registration) => {
          // 免除申請情報を取得
          const exemption = event.isRecurring
            ? exemptionsByEvent.get(event.id)?.get(registration.userId)
            : undefined

          // ステータスを計算
          let participantStatus: 'attended_code' | 'attended_video' | 'exempted' | 'video_incomplete' | 'registered' | 'not_responded' = 'registered'
          let statusLabel = '参加登録済み'

          if (exemption && exemption.status === 'APPROVED') {
            participantStatus = 'exempted'
            statusLabel = '免除承認済み'
          } else if (exemption && exemption.status === 'PENDING') {
            participantStatus = 'exempted'
            statusLabel = '免除申請中'
          } else if (registration.attendanceCompletedAt) {
            if (registration.attendanceMethod === 'CODE') {
              participantStatus = 'attended_code'
              statusLabel = '参加コード出席'
            } else {
              participantStatus = 'attended_video'
              statusLabel = '動画視聴出席'
            }
          } else if (registration.videoWatched || registration.surveyCompleted) {
            participantStatus = 'video_incomplete'
            statusLabel = '動画/アンケート途中'
          }

          return {
            id: registration.id,
            userId: registration.userId,
            userName: registration.user?.name ?? '',
            userEmail: registration.user?.email ?? '',
            userMemberId: registration.user?.memberId ?? null,
            registeredAt: registration.createdAt.toISOString(),
            // 出席状況
            attendanceMethod: registration.attendanceMethod ?? null,
            attendanceCompletedAt: registration.attendanceCompletedAt?.toISOString() ?? null,
            videoWatched: registration.videoWatched ?? false,
            surveyCompleted: registration.surveyCompleted ?? false,
            // ステータス
            status: participantStatus,
            statusLabel,
            // 免除申請
            hasExemption: !!exemption,
            exemptionStatus: exemption?.status ?? null,
            exemptionReason: exemption?.reason ?? null,
          }
        }),
      }
    })

    return NextResponse.json({ success: true, events: formattedEvents })
  } catch (error) {
    console.error('[ADMIN_EVENTS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'イベント情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const {
      title,
      description,
      date,
      time,
      type = 'optional', // 後方互換性のため残す
      targetRoles = [],
      attendanceType = 'optional',
      venueType = 'online',
      location,
      maxParticipants,
      status = 'upcoming',
      thumbnailUrl,
      isPaid = false,
      price,
      // 出席確認関連
      attendanceCode,
      vimeoUrl,
      surveyUrl,
      applicationDeadline,
      attendanceDeadline,
      // 定期開催関連
      isRecurring = false,
      recurrencePattern,
      // 過去イベント記録用
      summary,
      photos = [],
      materialsUrl,
      actualParticipants,
      actualLocation,
      adminNotes,
      isArchiveOnly = false,
    } = body || {}

    if (!title || !date) {
      return NextResponse.json(
        { success: false, error: 'title と date は必須です' },
        { status: 400 }
      )
    }

    // 有料イベントの場合、価格が必須
    if (isPaid && (!price || price <= 0)) {
      return NextResponse.json(
        { success: false, error: '有料イベントの場合、価格（0円より大きい金額）が必須です' },
        { status: 400 }
      )
    }

    const eventType = EVENT_TYPE_INPUT_MAP[type] ?? 'OPTIONAL'
    const eventTargetRoles = targetRoles.map((role: string) => EVENT_TARGET_ROLE_INPUT_MAP[role] ?? 'ALL')
    const eventAttendanceType = EVENT_ATTENDANCE_TYPE_INPUT_MAP[attendanceType] ?? 'OPTIONAL'
    const eventVenueType = EVENT_VENUE_TYPE_INPUT_MAP[venueType] ?? 'ONLINE'
    const eventStatus = EVENT_STATUS_INPUT_MAP[status] ?? 'UPCOMING'

    const createdEvent = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        time,
        type: eventType, // 後方互換性のため残す
        targetRoles: eventTargetRoles,
        attendanceType: eventAttendanceType,
        venueType: eventVenueType,
        location,
        maxParticipants: maxParticipants !== undefined ? Number(maxParticipants) : null,
        status: eventStatus,
        thumbnailUrl: thumbnailUrl || null,
        isPaid,
        price: isPaid ? Number(price) : null,
        // 出席確認関連
        attendanceCode: attendanceCode || null,
        vimeoUrl: vimeoUrl || null,
        surveyUrl: surveyUrl || null,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline + '+09:00') : null,
        attendanceDeadline: attendanceDeadline ? new Date(attendanceDeadline + '+09:00') : null,
        // 定期開催関連
        isRecurring,
        recurrencePattern: recurrencePattern || null,
        // 過去イベント記録用
        summary: summary || null,
        photos: photos || [],
        materialsUrl: materialsUrl || null,
        actualParticipants: actualParticipants !== undefined ? Number(actualParticipants) : null,
        actualLocation: actualLocation || null,
        adminNotes: adminNotes || null,
        isArchiveOnly,
      },
    })

    // 有料イベントの場合、Stripe Priceを作成
    if (isPaid && price) {
      try {
        await createEventPrice({
          eventId: createdEvent.id,
          eventTitle: createdEvent.title,
          price: Number(price),
        })
      } catch (stripeError) {
        console.error('Failed to create Stripe Price:', stripeError)
        // Stripe Price作成失敗時はイベントを削除してエラーを返す
        await prisma.event.delete({ where: { id: createdEvent.id } })
        return NextResponse.json(
          { success: false, error: 'Stripe決済設定の作成に失敗しました' },
          { status: 500 }
        )
      }
    }

    // 全体MTGの場合、全FPエイドを自動登録
    if (isRecurring) {
      try {
        const fpUsers = await prisma.user.findMany({
          where: { role: 'FP' },
          select: { id: true },
        })

        if (fpUsers.length > 0) {
          await prisma.eventRegistration.createMany({
            data: fpUsers.map(user => ({
              userId: user.id,
              eventId: createdEvent.id,
              paymentStatus: 'FREE', // 全体MTGは無料
            })),
            skipDuplicates: true,
          })
          console.log(`[MTG_AUTO_REGISTER] ${fpUsers.length}名のFPエイドを自動登録しました`)
        }
      } catch (registrationError) {
        console.error('[MTG_AUTO_REGISTER_ERROR]', registrationError)
        // 登録失敗はイベント作成の失敗とはしない（ログのみ）
      }
    }

    // 記録専用イベントでない場合のみ新着通知を作成
    if (!isArchiveOnly) {
      try {
        // EventTargetRole を UserRole に変換
        const notificationTargetRoles = eventTargetRoles
          .filter((role: string) => role !== 'ALL') // 'ALL' は除外
          .map((role: string) => {
            if (role === 'MEMBER') return 'MEMBER'
            if (role === 'FP') return 'FP'
            if (role === 'MANAGER') return 'MANAGER'
            return 'MEMBER'
          })

        // 'ALL' が含まれている場合は全ロールを対象にする
        const finalTargetRoles = eventTargetRoles.includes('ALL')
          ? [] // 空配列 = 全員向け
          : notificationTargetRoles

        console.log('[EVENT_NOTIFICATION_DEBUG]', {
          eventTitle: title,
          eventTargetRoles,
          notificationTargetRoles,
          finalTargetRoles,
          hasAll: eventTargetRoles.includes('ALL')
        })

        await prisma.systemNotification.create({
          data: {
            type: 'EVENT_ADDED',
            title: `新しいイベント「${title}」が追加されました`,
            contentType: 'EVENT',
            contentId: createdEvent.id,
            targetUrl: `/dashboard/events/${createdEvent.id}`,
            targetRoles: finalTargetRoles,
          }
        })
      } catch (notificationError) {
        console.error('[EVENT_NOTIFICATION_ERROR]', notificationError)
        // 通知作成失敗はイベント作成の失敗とはしない（ログのみ）
      }
    }

    const attendanceTypeKey = createdEvent.attendanceType as keyof typeof EVENT_ATTENDANCE_TYPE_MAP
    const venueTypeKey = createdEvent.venueType as keyof typeof EVENT_VENUE_TYPE_MAP

    return NextResponse.json({
      success: true,
      event: {
        id: createdEvent.id,
        title: createdEvent.title,
        description: createdEvent.description ?? '',
        date: createdEvent.date.toISOString(),
        time: createdEvent.time ?? '',
        type, // 後方互換性のため残す
        targetRoles: (createdEvent.targetRoles || []).map(role => EVENT_TARGET_ROLE_MAP[role as keyof typeof EVENT_TARGET_ROLE_MAP]),
        attendanceType: EVENT_ATTENDANCE_TYPE_MAP[attendanceTypeKey] ?? 'optional',
        venueType: EVENT_VENUE_TYPE_MAP[venueTypeKey] ?? 'online',
        location: createdEvent.location ?? '',
        maxParticipants: createdEvent.maxParticipants ?? null,
        status,
        thumbnailUrl: createdEvent.thumbnailUrl ?? null,
        currentParticipants: 0,
        registrations: [],
      },
    })
  } catch (error) {
    console.error('[ADMIN_EVENTS_POST_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'イベントの作成に失敗しました' },
      { status: 500 }
    )
  }
}

