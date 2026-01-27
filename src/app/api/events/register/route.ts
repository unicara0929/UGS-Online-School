import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

type ActionType = 'register' | 'unregister'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { eventId, scheduleId, action } = body as {
      eventId?: string
      scheduleId?: string // 日程ID（複数日程対応）
      action?: ActionType
    }

    if (!eventId || !action) {
      return NextResponse.json(
        {
          success: false,
          error: 'eventId、action（register/unregister）は必須です',
        },
        { status: 400 }
      )
    }

    if (action !== 'register' && action !== 'unregister') {
      return NextResponse.json(
        { success: false, error: 'action の値が不正です' },
        { status: 400 }
      )
    }

    // 認証ユーザーのIDを使用
    const userId = authUser!.id

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        schedules: {
          include: {
            _count: {
              select: { registrations: true, externalRegistrations: true }
            }
          }
        },
        registrations: {
          where: { userId },
          select: { id: true, scheduleId: true },
        },
        _count: {
          select: { registrations: true, externalRegistrations: true },
        },
      },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // スケジュールIDが指定されている場合、存在確認
    const targetSchedule = scheduleId
      ? event.schedules.find(s => s.id === scheduleId)
      : event.schedules[0] // 指定なしの場合は最初のスケジュール

    if (action === 'register') {
      // 有料イベントの場合は直接登録を拒否
      if (event.isPaid) {
        return NextResponse.json(
          {
            success: false,
            error: '有料イベントは決済が必要です。チェックアウトページから申し込みしてください。',
          },
          { status: 400 }
        )
      }

      // 同じスケジュールに既に登録済みかチェック
      const existingRegistration = event.registrations.find(
        r => r.scheduleId === (targetSchedule?.id ?? null)
      )
      if (existingRegistration) {
        return NextResponse.json({
          success: true,
          message: '既に申し込み済みです',
        })
      }

      // 無料イベントとして登録
      await prisma.eventRegistration.create({
        data: {
          userId,
          eventId,
          scheduleId: targetSchedule?.id ?? null,
          paymentStatus: 'FREE', // 無料イベント
        },
      })
    } else if (action === 'unregister') {
      // 登録を探す
      // 1. まずscheduleIdで完全一致を探す
      // 2. 見つからなければ、scheduleId=nullの登録を探す（旧データ対応）
      // 3. それでもなければ最初の登録を使用
      let targetRegistration = scheduleId
        ? event.registrations.find(r => r.scheduleId === scheduleId)
        : null

      if (!targetRegistration) {
        // scheduleIdがnullの登録を探す（移行前のデータ）
        targetRegistration = event.registrations.find(r => r.scheduleId === null)
      }

      if (!targetRegistration && event.registrations.length > 0) {
        // それでも見つからなければ最初の登録を使用
        targetRegistration = event.registrations[0]
      }

      if (!targetRegistration) {
        return NextResponse.json({
          success: true,
          message: '申し込みは既にキャンセルされています',
        })
      }

      await prisma.eventRegistration.delete({
        where: { id: targetRegistration.id },
      })
    }

    const updatedEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: { select: { registrations: true, externalRegistrations: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: action === 'register' ? '申し込みが完了しました' : '申し込みをキャンセルしました',
      currentParticipants: (updatedEvent?._count.registrations ?? 0) + (updatedEvent?._count.externalRegistrations ?? 0),
    })
  } catch (error) {
    console.error('[EVENTS_REGISTER_POST_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '申し込み処理に失敗しました' },
      { status: 500 }
    )
  }
}

