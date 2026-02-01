import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import {
  EVENT_TYPE_INPUT_MAP,
  EVENT_VENUE_TYPE_INPUT_MAP,
  EVENT_TARGET_ROLE_INPUT_MAP,
  EVENT_ATTENDANCE_TYPE_INPUT_MAP,
  EVENT_STATUS_INPUT_MAP,
} from '@/lib/constants/event-enums'

/**
 * イベント編集API
 * PUT /api/admin/events/[eventId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { eventId } = await params

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId が指定されていません' },
        { status: 400 }
      )
    }

    // 既存イベントを取得
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      type,
      targetRoles,
      attendanceType,
      venueType,
      status,
      thumbnailUrl,
      isPaid,
      price,
      // 出席確認関連（イベントレベル）
      vimeoUrl,
      surveyUrl,
      // 期限設定（日数ベース）
      applicationDeadlineDays,
      attendanceDeadlineDays,
      // 期限設定（DateTime直接指定 - 全体MTG用）
      applicationDeadline,
      // スケジュール関連（全体MTG編集時に使用）
      attendanceCode,
      date,
      time,
      location,
      onlineMeetingUrl,
      // 定期開催関連
      isRecurring,
      recurrencePattern,
      // イベントカテゴリ
      eventCategory,
      // 外部参加者設定
      allowExternalParticipation,
      // 過去イベント記録用
      summary,
      photos,
      materialsUrl,
      adminNotes,
      isArchiveOnly,
    } = body || {}

    // 更新データを構築
    const updateData: Prisma.EventUpdateInput = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (type !== undefined) updateData.type = EVENT_TYPE_INPUT_MAP[type] ?? 'OPTIONAL'
    if (targetRoles !== undefined) {
      updateData.targetRoles = targetRoles.map((role: string) => EVENT_TARGET_ROLE_INPUT_MAP[role] ?? 'ALL')
    }
    if (attendanceType !== undefined) {
      updateData.attendanceType = EVENT_ATTENDANCE_TYPE_INPUT_MAP[attendanceType] ?? 'OPTIONAL'
    }
    if (venueType !== undefined) {
      updateData.venueType = EVENT_VENUE_TYPE_INPUT_MAP[venueType] ?? 'ONLINE'
    }
    if (status !== undefined) {
      updateData.status = EVENT_STATUS_INPUT_MAP[status] ?? 'UPCOMING'
    }
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl || null
    if (isPaid !== undefined) updateData.isPaid = isPaid
    if (price !== undefined) updateData.price = isPaid ? Number(price) : null

    // 出席確認関連（イベントレベル）
    if (vimeoUrl !== undefined) updateData.vimeoUrl = vimeoUrl || null
    if (surveyUrl !== undefined) updateData.surveyUrl = surveyUrl || null
    // 期限設定（日数ベース）
    if (applicationDeadlineDays !== undefined) {
      updateData.applicationDeadlineDays = applicationDeadlineDays !== null ? Number(applicationDeadlineDays) : null
    }
    if (attendanceDeadlineDays !== undefined) {
      updateData.attendanceDeadlineDays = attendanceDeadlineDays !== null ? Number(attendanceDeadlineDays) : null
    }
    // 期限設定（DateTime直接指定 - 全体MTG用）
    if (applicationDeadline !== undefined) {
      updateData.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : null
    }

    // 定期開催関連
    if (isRecurring !== undefined) updateData.isRecurring = isRecurring
    if (recurrencePattern !== undefined) updateData.recurrencePattern = recurrencePattern || null
    // イベントカテゴリ（isRecurringがtrueになった場合は自動でMTG）
    if (eventCategory !== undefined) {
      updateData.eventCategory = eventCategory
    } else if (isRecurring !== undefined && isRecurring) {
      updateData.eventCategory = 'MTG'
    }

    // 過去イベント記録用
    if (summary !== undefined) updateData.summary = summary || null
    if (photos !== undefined) updateData.photos = photos || []
    if (materialsUrl !== undefined) updateData.materialsUrl = materialsUrl || null
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes || null
    if (isArchiveOnly !== undefined) updateData.isArchiveOnly = isArchiveOnly

    // 外部参加者設定
    if (allowExternalParticipation !== undefined) {
      updateData.allowExternalParticipation = allowExternalParticipation
      // ONに変更された場合でトークンがなければ生成
      if (allowExternalParticipation && !existingEvent.externalRegistrationToken) {
        updateData.externalRegistrationToken = crypto.randomUUID()
      }
    }

    // 有料イベントの検証
    if (isPaid && (!price || price <= 0)) {
      return NextResponse.json(
        { success: false, error: '有料イベントの場合、価格（0円より大きい金額）が必須です' },
        { status: 400 }
      )
    }

    // isPaidまたはpriceが変更された場合、Stripe Priceを同期
    const isPaidChanged = isPaid !== undefined && isPaid !== existingEvent.isPaid
    const priceChanged = price !== undefined && Number(price) !== existingEvent.price

    if (isPaidChanged || priceChanged) {
      const finalIsPaid = isPaid !== undefined ? isPaid : existingEvent.isPaid
      const finalPrice = price !== undefined ? Number(price) : existingEvent.price

      if (finalIsPaid && finalPrice && finalPrice > 0) {
        // 有料イベント: Stripe Priceを作成または更新
        try {
          const { updateEventPrice } = await import('@/lib/services/event-price-service')
          const newPriceId = await updateEventPrice({
            eventId,
            eventTitle: title || existingEvent.title,
            oldStripePriceId: existingEvent.stripePriceId,
            newPrice: finalPrice,
          })
          updateData.stripePriceId = newPriceId
          console.log('Stripe Price updated:', { eventId, newPriceId })
        } catch (error) {
          console.error('Failed to update Stripe Price:', error)
          return NextResponse.json(
            { success: false, error: 'Stripe決済設定の更新に失敗しました' },
            { status: 500 }
          )
        }
      } else {
        // 無料イベント: Stripe Priceを無効化
        if (existingEvent.stripePriceId) {
          try {
            const { deleteEventPrice } = await import('@/lib/services/event-price-service')
            await deleteEventPrice(existingEvent.stripePriceId)
            console.log('Stripe Price deleted:', { eventId, priceId: existingEvent.stripePriceId })
          } catch (error) {
            console.error('Failed to delete Stripe Price:', error)
            // エラーでも続行（イベント更新は止めない）
          }
        }
        updateData.stripePriceId = null
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
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
        }
      }
    })

    // スケジュール関連フィールドの更新（全体MTG編集時）
    const firstScheduleForUpdate = updatedEvent.schedules[0]
    if (firstScheduleForUpdate) {
      const scheduleUpdateData: Record<string, unknown> = {}
      if (attendanceCode !== undefined) scheduleUpdateData.attendanceCode = attendanceCode || null
      if (date !== undefined) scheduleUpdateData.date = new Date(date)
      if (time !== undefined) scheduleUpdateData.time = time || null
      if (location !== undefined) scheduleUpdateData.location = location || null
      if (onlineMeetingUrl !== undefined) scheduleUpdateData.onlineMeetingUrl = onlineMeetingUrl || null

      if (Object.keys(scheduleUpdateData).length > 0) {
        await prisma.eventSchedule.update({
          where: { id: firstScheduleForUpdate.id },
          data: scheduleUpdateData,
        })
      }
    }

    // 更新後のイベントを再取得（スケジュール更新を反映）
    const refreshedEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
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
        }
      }
    })

    // 最初のスケジュール（後方互換性用）
    const firstSchedule = refreshedEvent!.schedules[0]

    return NextResponse.json({
      success: true,
      event: {
        id: refreshedEvent!.id,
        title: refreshedEvent!.title,
        description: refreshedEvent!.description ?? '',
        // 後方互換性：最初のスケジュールの日付を使用
        date: firstSchedule?.date.toISOString() ?? null,
        time: firstSchedule?.time ?? '',
        type: refreshedEvent!.type,
        targetRoles: refreshedEvent!.targetRoles,
        attendanceType: refreshedEvent!.attendanceType,
        venueType: refreshedEvent!.venueType,
        location: firstSchedule?.location ?? '',
        onlineMeetingUrl: firstSchedule?.onlineMeetingUrl ?? null,
        status: refreshedEvent!.status,
        thumbnailUrl: refreshedEvent!.thumbnailUrl ?? null,
        isPaid: refreshedEvent!.isPaid,
        price: refreshedEvent!.price ?? null,
        // 出席確認関連
        attendanceCode: firstSchedule?.attendanceCode ?? null,
        vimeoUrl: refreshedEvent!.vimeoUrl ?? null,
        surveyUrl: refreshedEvent!.surveyUrl ?? null,
        // 期限設定
        applicationDeadline: refreshedEvent!.applicationDeadline?.toISOString() ?? null,
        applicationDeadlineDays: refreshedEvent!.applicationDeadlineDays ?? null,
        attendanceDeadlineDays: refreshedEvent!.attendanceDeadlineDays ?? null,
        // 定期開催関連
        isRecurring: refreshedEvent!.isRecurring,
        recurrencePattern: refreshedEvent!.recurrencePattern ?? null,
        // イベントカテゴリ
        eventCategory: refreshedEvent!.eventCategory,
        // 過去イベント記録用
        summary: refreshedEvent!.summary ?? null,
        photos: refreshedEvent!.photos ?? [],
        materialsUrl: refreshedEvent!.materialsUrl ?? null,
        adminNotes: refreshedEvent!.adminNotes ?? null,
        isArchiveOnly: refreshedEvent!.isArchiveOnly ?? false,
        // 外部参加者設定
        allowExternalParticipation: refreshedEvent!.allowExternalParticipation ?? false,
        externalRegistrationToken: refreshedEvent!.externalRegistrationToken ?? null,
        // 日程一覧
        schedules: refreshedEvent!.schedules.map(schedule => ({
          id: schedule.id,
          date: schedule.date.toISOString(),
          time: schedule.time ?? '',
          location: schedule.location ?? '',
          onlineMeetingUrl: schedule.onlineMeetingUrl ?? null,
          status: schedule.status,
          attendanceCode: schedule.attendanceCode ?? null,
          registrationCount: schedule._count.registrations + schedule._count.externalRegistrations,
          createdAt: schedule.createdAt.toISOString(),
          updatedAt: schedule.updatedAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error('[ADMIN_EVENTS_PUT_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'イベントの更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * イベント削除API
 * DELETE /api/admin/events/[eventId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { eventId } = await params

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId が指定されていません' },
        { status: 400 }
      )
    }

    await prisma.event.delete({
      where: { id: eventId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN_EVENTS_DELETE_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'イベントの削除に失敗しました' },
      { status: 500 }
    )
  }
}

