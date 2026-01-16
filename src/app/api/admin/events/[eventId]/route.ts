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
      date,
      time,
      type,
      targetRoles,
      attendanceType,
      venueType,
      location,
      onlineMeetingUrl,
      maxParticipants,
      status,
      thumbnailUrl,
      isPaid,
      price,
      // 出席確認関連
      attendanceCode,
      vimeoUrl,
      surveyUrl,
      attendanceDeadline,
      // 定期開催関連
      isRecurring,
      recurrencePattern,
      applicationDeadline,
      // イベントカテゴリ
      eventCategory,
      // 外部参加者設定
      allowExternalParticipation,
      // 過去イベント記録用
      summary,
      photos,
      materialsUrl,
      actualParticipants,
      actualLocation,
      adminNotes,
      isArchiveOnly,
    } = body || {}

    // 更新データを構築
    const updateData: Prisma.EventUpdateInput = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (date !== undefined) updateData.date = new Date(date)
    if (time !== undefined) updateData.time = time
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
    if (location !== undefined) updateData.location = location
    if (onlineMeetingUrl !== undefined) updateData.onlineMeetingUrl = onlineMeetingUrl || null
    if (maxParticipants !== undefined) {
      // 0, 空文字, nullは制限なし（null）として扱う
      updateData.maxParticipants = maxParticipants && Number(maxParticipants) > 0 ? Number(maxParticipants) : null
    }
    if (status !== undefined) {
      updateData.status = EVENT_STATUS_INPUT_MAP[status] ?? 'UPCOMING'
    }
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl || null
    if (isPaid !== undefined) updateData.isPaid = isPaid
    if (price !== undefined) updateData.price = isPaid ? Number(price) : null

    // 出席確認関連
    if (attendanceCode !== undefined) updateData.attendanceCode = attendanceCode || null
    if (vimeoUrl !== undefined) updateData.vimeoUrl = vimeoUrl || null
    if (surveyUrl !== undefined) updateData.surveyUrl = surveyUrl || null
    if (attendanceDeadline !== undefined) {
      if (attendanceDeadline) {
        // datetime-localの値はタイムゾーンなしなので、JSTとして解釈する
        // 例: "2024-12-20T23:59" -> JST 2024-12-20 23:59
        const deadlineDate = new Date(attendanceDeadline + '+09:00')
        updateData.attendanceDeadline = deadlineDate
      } else {
        updateData.attendanceDeadline = null
      }
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
    if (applicationDeadline !== undefined) {
      if (applicationDeadline) {
        // datetime-localの値はタイムゾーンなしなので、JSTとして解釈する
        const deadlineDate = new Date(applicationDeadline + '+09:00')
        updateData.applicationDeadline = deadlineDate
      } else {
        updateData.applicationDeadline = null
      }
    }

    // 過去イベント記録用
    if (summary !== undefined) updateData.summary = summary || null
    if (photos !== undefined) updateData.photos = photos || []
    if (materialsUrl !== undefined) updateData.materialsUrl = materialsUrl || null
    if (actualParticipants !== undefined) {
      updateData.actualParticipants = actualParticipants !== null ? Number(actualParticipants) : null
    }
    if (actualLocation !== undefined) updateData.actualLocation = actualLocation || null
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
    })

    return NextResponse.json({
      success: true,
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description ?? '',
        date: updatedEvent.date.toISOString(),
        time: updatedEvent.time ?? '',
        type: updatedEvent.type,
        targetRoles: updatedEvent.targetRoles,
        attendanceType: updatedEvent.attendanceType,
        venueType: updatedEvent.venueType,
        location: updatedEvent.location ?? '',
        onlineMeetingUrl: updatedEvent.onlineMeetingUrl ?? null,
        maxParticipants: updatedEvent.maxParticipants ?? null,
        status: updatedEvent.status,
        thumbnailUrl: updatedEvent.thumbnailUrl ?? null,
        isPaid: updatedEvent.isPaid,
        price: updatedEvent.price ?? null,
        // 出席確認関連
        attendanceCode: updatedEvent.attendanceCode ?? null,
        vimeoUrl: updatedEvent.vimeoUrl ?? null,
        surveyUrl: updatedEvent.surveyUrl ?? null,
        attendanceDeadline: updatedEvent.attendanceDeadline?.toISOString() ?? null,
        // 定期開催関連
        isRecurring: updatedEvent.isRecurring,
        recurrencePattern: updatedEvent.recurrencePattern ?? null,
        applicationDeadline: updatedEvent.applicationDeadline?.toISOString() ?? null,
        // イベントカテゴリ
        eventCategory: updatedEvent.eventCategory,
        // 過去イベント記録用
        summary: updatedEvent.summary ?? null,
        photos: updatedEvent.photos ?? [],
        materialsUrl: updatedEvent.materialsUrl ?? null,
        actualParticipants: updatedEvent.actualParticipants ?? null,
        actualLocation: updatedEvent.actualLocation ?? null,
        adminNotes: updatedEvent.adminNotes ?? null,
        isArchiveOnly: updatedEvent.isArchiveOnly ?? false,
        // 外部参加者設定
        allowExternalParticipation: updatedEvent.allowExternalParticipation ?? false,
        externalRegistrationToken: updatedEvent.externalRegistrationToken ?? null,
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

