import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { eventId, scheduleId, attendanceCode } = body as {
      eventId?: string
      scheduleId?: string
      attendanceCode?: string
    }

    // バリデーション
    if (!eventId || !attendanceCode) {
      return NextResponse.json(
        { success: false, error: 'イベントIDと参加コードは必須です' },
        { status: 400 }
      )
    }

    const userId = authUser!.id

    // イベント情報を取得（スケジュール含む）
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        vimeoUrl: true,
        isRecurring: true,
        attendanceDeadlineDays: true,
        schedules: {
          orderBy: { date: 'asc' },
          select: {
            id: true,
            date: true,
            attendanceCode: true,
          }
        }
      },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 動画URLが設定されている場合は出席コード入力を無効にする
    // （完了設定で動画を設定した後は、出席コードでの出席確認を受け付けない）
    if (event.vimeoUrl) {
      return NextResponse.json(
        { success: false, error: 'このイベントは録画視聴による出席確認のみ受け付けています' },
        { status: 400 }
      )
    }

    // 対象スケジュールを決定
    let targetSchedule = scheduleId
      ? event.schedules.find(s => s.id === scheduleId)
      : null

    // スケジュール指定がない場合、参加コードが一致するスケジュールを探す
    if (!targetSchedule) {
      targetSchedule = event.schedules.find(
        s => s.attendanceCode?.toUpperCase() === attendanceCode.toUpperCase()
      )
    }

    if (!targetSchedule) {
      return NextResponse.json(
        { success: false, error: '参加コードが正しくありません' },
        { status: 400 }
      )
    }

    // 参加コードが設定されているか確認
    if (!targetSchedule.attendanceCode) {
      return NextResponse.json(
        { success: false, error: 'このイベントは参加コード機能が有効ではありません' },
        { status: 400 }
      )
    }

    // 参加コードが一致するか確認（大文字小文字を区別しない）
    if (targetSchedule.attendanceCode.toUpperCase() !== attendanceCode.toUpperCase()) {
      return NextResponse.json(
        { success: false, error: '参加コードが正しくありません' },
        { status: 400 }
      )
    }

    // 期限チェック（日数ベース）
    if (event.attendanceDeadlineDays !== null && targetSchedule.date) {
      const deadline = new Date(targetSchedule.date)
      deadline.setDate(deadline.getDate() + event.attendanceDeadlineDays)
      if (new Date() > deadline) {
        return NextResponse.json(
          { success: false, error: '出席完了期限を過ぎています' },
          { status: 400 }
        )
      }
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

    // 全体MTG: 参加意思チェック（「参加する」以外はコード入力不可）
    if (event.isRecurring) {
      if (registration.participationIntent === 'WILL_NOT_ATTEND') {
        return NextResponse.json(
          { success: false, error: '欠席申請しているため参加コードは入力できません' },
          { status: 400 }
        )
      }
      if (registration.participationIntent === 'UNDECIDED') {
        return NextResponse.json(
          { success: false, error: '参加意思が未回答のため参加コードは入力できません' },
          { status: 400 }
        )
      }
    }

    // 既に出席完了済みか確認
    if (registration.attendanceCompletedAt) {
      return NextResponse.json(
        {
          success: true,
          message: '既に出席完了済みです',
          attendanceMethod: registration.attendanceMethod,
          completedAt: registration.attendanceCompletedAt,
        },
        { status: 200 }
      )
    }

    // 出席完了として記録
    const updatedRegistration = await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        attendanceMethod: 'CODE',
        attendanceCompletedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: '出席が完了しました！',
      attendanceMethod: updatedRegistration.attendanceMethod,
      completedAt: updatedRegistration.attendanceCompletedAt,
    })
  } catch (error) {
    console.error('[SUBMIT_ATTENDANCE_CODE_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '出席確認の処理に失敗しました' },
      { status: 500 }
    )
  }
}
