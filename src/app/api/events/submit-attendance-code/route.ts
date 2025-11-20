import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { eventId, attendanceCode } = body as {
      eventId?: string
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

    // イベント情報を取得
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        attendanceCode: true,
        attendanceDeadline: true,
      },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 参加コードが設定されているか確認
    if (!event.attendanceCode) {
      return NextResponse.json(
        { success: false, error: 'このイベントは参加コード機能が有効ではありません' },
        { status: 400 }
      )
    }

    // 参加コードが一致するか確認（大文字小文字を区別しない）
    if (event.attendanceCode.toUpperCase() !== attendanceCode.toUpperCase()) {
      return NextResponse.json(
        { success: false, error: '参加コードが正しくありません' },
        { status: 400 }
      )
    }

    // 期限チェック
    if (event.attendanceDeadline && new Date() > new Date(event.attendanceDeadline)) {
      return NextResponse.json(
        { success: false, error: '出席完了期限を過ぎています' },
        { status: 400 }
      )
    }

    // イベント登録を確認
    const registration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    })

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'このイベントに申し込みされていません' },
        { status: 400 }
      )
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
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
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
