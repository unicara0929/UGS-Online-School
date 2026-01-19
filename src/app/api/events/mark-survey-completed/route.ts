import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { eventId } = body as { eventId?: string }

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'イベントIDは必須です' },
        { status: 400 }
      )
    }

    const userId = authUser!.id

    // イベント情報を取得
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        surveyUrl: true,
      },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // Survey URLが設定されているか確認
    if (!event.surveyUrl) {
      return NextResponse.json(
        { success: false, error: 'このイベントにはアンケートが登録されていません' },
        { status: 400 }
      )
    }

    // イベント登録を確認
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        userId,
        eventId,
      },
    })

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'このイベントに申し込みされていません' },
        { status: 400 }
      )
    }

    // 動画視聴完了チェック（アンケートは動画視聴完了後のみ可能）
    if (!registration.videoWatched) {
      return NextResponse.json(
        { success: false, error: '先に動画を最後まで視聴してください' },
        { status: 400 }
      )
    }

    // イベントが全体MTGかどうかを確認
    const eventWithRecurring = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isRecurring: true },
    })

    const updatedRegistration = await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        surveyCompleted: true,
        surveyCompletedAt: new Date(),
      },
    })

    // 録画視聴とアンケート両方完了している場合
    if (updatedRegistration.videoWatched && updatedRegistration.surveyCompleted) {
      // 全体MTGで未回答者（UNDECIDED）の場合は正式参加扱いにしない
      // GM面談完了時に正式参加扱いにする
      if (eventWithRecurring?.isRecurring && updatedRegistration.participationIntent === 'UNDECIDED') {
        return NextResponse.json({
          success: true,
          message: '録画視聴とアンケート回答が完了しました。GM面談後に正式参加となります。',
          attendanceCompleted: false,
          needsGmInterview: true,
        })
      }

      // 通常のケース（参加選択者 or 欠席申請者）: 出席完了として記録
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          attendanceMethod: 'VIDEO_SURVEY',
          attendanceCompletedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: '録画視聴とアンケート回答が完了しました！出席が確認されました。',
        attendanceCompleted: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'アンケート回答が記録されました。録画を視聴して出席を完了してください。',
      attendanceCompleted: false,
    })
  } catch (error) {
    console.error('[MARK_SURVEY_COMPLETED_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'アンケート回答の記録に失敗しました' },
      { status: 500 }
    )
  }
}
