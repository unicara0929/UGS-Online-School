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
    const { eventId, action } = body as {
      eventId?: string
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
        registrations: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: { registrations: true },
        },
      },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

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

      if (event.registrations.length > 0) {
        return NextResponse.json({
          success: true,
          message: '既に申し込み済みです',
        })
      }

      if (
        event.maxParticipants !== null &&
        event.maxParticipants !== undefined &&
        event._count.registrations >= event.maxParticipants
      ) {
        return NextResponse.json(
          {
            success: false,
            error: '定員に達しているため申し込むことができません',
          },
          { status: 400 }
        )
      }

      // 無料イベントとして登録
      await prisma.eventRegistration.create({
        data: {
          userId,
          eventId,
          paymentStatus: 'FREE', // 無料イベント
        },
      })
    } else if (action === 'unregister') {
      if (event.registrations.length === 0) {
        return NextResponse.json({
          success: true,
          message: '申し込みは既にキャンセルされています',
        })
      }

      await prisma.eventRegistration.delete({
        where: {
          userId_eventId: {
            userId,
            eventId,
          },
        },
      })
    }

    const updatedEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: { select: { registrations: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: action === 'register' ? '申し込みが完了しました' : '申し込みをキャンセルしました',
      currentParticipants: updatedEvent?._count.registrations ?? 0,
    })
  } catch (error) {
    console.error('[EVENTS_REGISTER_POST_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '申し込み処理に失敗しました' },
      { status: 500 }
    )
  }
}

