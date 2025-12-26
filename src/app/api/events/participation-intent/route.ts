import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 全体MTGの参加意思を登録・更新するAPI
 * POST: 参加意思を登録/更新
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { eventId, intent } = body

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventIdは必須です' },
        { status: 400 }
      )
    }

    if (!intent || !['WILL_ATTEND', 'WILL_NOT_ATTEND'].includes(intent)) {
      return NextResponse.json(
        { success: false, error: '無効な参加意思です' },
        { status: 400 }
      )
    }

    // イベントを取得
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 全体MTGでない場合はエラー
    if (!event.isRecurring) {
      return NextResponse.json(
        { success: false, error: 'このイベントは全体MTGではありません' },
        { status: 400 }
      )
    }

    // 参加登録を取得/作成
    let registration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId: authUser!.id,
          eventId: eventId,
        },
      },
    })

    if (!registration) {
      // 登録がない場合は作成
      registration = await prisma.eventRegistration.create({
        data: {
          userId: authUser!.id,
          eventId: eventId,
          paymentStatus: 'FREE',
          participationIntent: intent,
          participationIntentAt: new Date(),
        },
      })
    } else {
      // 既に出席完了している場合は変更不可
      if (registration.attendanceCompletedAt) {
        return NextResponse.json(
          { success: false, error: '既に出席完了しているため変更できません' },
          { status: 400 }
        )
      }

      // 参加意思を更新
      registration = await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          participationIntent: intent,
          participationIntentAt: new Date(),
        },
      })
    }

    // 「参加する」に変更した場合、既存の欠席申請（PENDING状態）を削除
    if (intent === 'WILL_ATTEND') {
      await prisma.mtgExemption.deleteMany({
        where: {
          userId: authUser!.id,
          eventId: eventId,
          status: 'PENDING', // 審査中のもののみ削除（承認済み・却下済みは残す）
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: intent === 'WILL_ATTEND' ? '参加予定として登録しました' : '不参加として登録しました',
      registration: {
        id: registration.id,
        participationIntent: registration.participationIntent,
        participationIntentAt: registration.participationIntentAt?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error('[PARTICIPATION_INTENT_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '参加意思の登録に失敗しました' },
      { status: 500 }
    )
  }
}
