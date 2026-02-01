import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 全体MTG欠席申請API
 *
 * POST: 新規申請 or 既存申請の更新
 * GET: 自分の申請一覧を取得
 */

// 欠席申請を取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    // 特定イベントの申請を取得
    if (eventId) {
      const exemption = await prisma.mtgExemption.findUnique({
        where: {
          userId_eventId: {
            userId: authUser!.id,
            eventId,
          },
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              schedules: {
                orderBy: { date: 'asc' },
                take: 1,
                select: { date: true }
              }
            },
          },
        },
      })

      // レスポンス整形（後方互換性）
      const formattedExemption = exemption ? {
        ...exemption,
        event: {
          id: exemption.event.id,
          title: exemption.event.title,
          date: exemption.event.schedules[0]?.date ?? null,
        }
      } : null

      return NextResponse.json({
        success: true,
        exemption: formattedExemption,
      })
    }

    // 全申請一覧を取得
    const exemptions = await prisma.mtgExemption.findMany({
      where: {
        userId: authUser!.id,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            schedules: {
              orderBy: { date: 'asc' },
              take: 1,
              select: { date: true }
            }
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // レスポンス整形（後方互換性）
    const formattedExemptions = exemptions.map(e => ({
      ...e,
      event: {
        id: e.event.id,
        title: e.event.title,
        date: e.event.schedules[0]?.date ?? null,
      }
    }))

    return NextResponse.json({
      success: true,
      exemptions: formattedExemptions,
    })
  } catch (error) {
    console.error('[GET_EXEMPTION_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '欠席申請の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 欠席申請を作成/更新
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { eventId, reason } = body

    // バリデーション
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'イベントIDが必要です' },
        { status: 400 }
      )
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { success: false, error: '不参加理由を入力してください' },
        { status: 400 }
      )
    }

    // 文字数チェック（10〜1000文字）
    const trimmedReason = reason.trim()
    if (trimmedReason.length < 10) {
      return NextResponse.json(
        { success: false, error: '不参加理由は10文字以上で入力してください' },
        { status: 400 }
      )
    }
    if (trimmedReason.length > 1000) {
      return NextResponse.json(
        { success: false, error: '不参加理由は1000文字以内で入力してください' },
        { status: 400 }
      )
    }

    // イベントの存在確認
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        isRecurring: true,
        schedules: {
          orderBy: { date: 'asc' },
          take: 1,
          select: { date: true, time: true }
        }
      },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // イベント開始時間前かチェック（開始時間を過ぎたら申請不可）
    const now = new Date()
    const firstSchedule = event.schedules[0]
    if (firstSchedule) {
      const eventStart = new Date(firstSchedule.date)
      // 開催時間が設定されている場合（例: "19:00"）、その時間を反映
      if (firstSchedule.time) {
        const [hours, minutes] = firstSchedule.time.split(':').map(Number)
        if (!isNaN(hours) && !isNaN(minutes)) {
          eventStart.setHours(hours, minutes, 0, 0)
        }
      }
      if (eventStart < now) {
        return NextResponse.json(
          { success: false, error: 'イベント開始後は欠席申請できません' },
          { status: 400 }
        )
      }
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: {
        id: true,
        name: true,
        memberId: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    // 既存の申請を確認
    const existingExemption = await prisma.mtgExemption.findUnique({
      where: {
        userId_eventId: {
          userId: authUser!.id,
          eventId,
        },
      },
    })

    let exemption

    if (existingExemption) {
      // 既に承認/却下済みの場合は再申請不可
      if (existingExemption.status !== 'PENDING') {
        return NextResponse.json(
          {
            success: false,
            error: existingExemption.status === 'APPROVED'
              ? '既に欠席申請が承認されています'
              : '既に欠席申請が却下されています。管理者にお問い合わせください'
          },
          { status: 400 }
        )
      }

      // 審査中の場合は理由を更新
      exemption = await prisma.mtgExemption.update({
        where: { id: existingExemption.id },
        data: {
          reason: trimmedReason,
          updatedAt: new Date(),
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              schedules: {
                orderBy: { date: 'asc' },
                take: 1,
                select: { date: true }
              }
            },
          },
        },
      })
    } else {
      // 新規申請を作成（審査待ち）
      exemption = await prisma.mtgExemption.create({
        data: {
          userId: authUser!.id,
          eventId,
          reason: trimmedReason,
          status: 'PENDING', // 管理者による審査待ち
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              schedules: {
                orderBy: { date: 'asc' },
                take: 1,
                select: { date: true }
              }
            },
          },
        },
      })
    }

    // EventRegistrationのparticipationIntentをWILL_NOT_ATTENDに更新
    const existingRegistration = await prisma.eventRegistration.findFirst({
      where: {
        userId: authUser!.id,
        eventId,
      },
    })

    if (existingRegistration) {
      await prisma.eventRegistration.update({
        where: { id: existingRegistration.id },
        data: {
          participationIntent: 'WILL_NOT_ATTEND',
          participationIntentAt: new Date(),
        },
      })
    } else {
      await prisma.eventRegistration.create({
        data: {
          userId: authUser!.id,
          eventId,
          paymentStatus: 'FREE',
          participationIntent: 'WILL_NOT_ATTEND',
          participationIntentAt: new Date(),
        },
      })
    }

    // レスポンス整形（後方互換性）
    const formattedExemption = {
      ...exemption,
      event: {
        id: exemption.event.id,
        title: exemption.event.title,
        date: exemption.event.schedules[0]?.date ?? null,
      }
    }

    return NextResponse.json({
      success: true,
      message: existingExemption ? '欠席申請を更新しました' : '欠席申請を受け付けました。管理者による審査をお待ちください。',
      exemption: formattedExemption,
      isUpdate: !!existingExemption,
    })
  } catch (error) {
    console.error('[POST_EXEMPTION_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '欠席申請の送信に失敗しました' },
      { status: 500 }
    )
  }
}
