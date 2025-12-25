import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { FinalApprovalStatus } from '@prisma/client'

/**
 * 期限超過ユーザー用のEventRegistration作成API
 *
 * POST: registrationがない期限超過ユーザーにregistrationを作成してGM面談を記録
 */

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const { userId, eventId, markGmInterview } = body as {
      userId: string
      eventId: string
      markGmInterview?: boolean
    }

    if (!userId || !eventId) {
      return NextResponse.json(
        { success: false, error: 'userId と eventId は必須です' },
        { status: 400 }
      )
    }

    // ユーザーとイベントの存在確認
    const [user, event] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.event.findUnique({ where: { id: eventId } }),
    ])

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 既存のregistrationがあるか確認
    const existingRegistration = await prisma.eventRegistration.findFirst({
      where: { userId, eventId },
    })

    if (existingRegistration) {
      // 既存のregistrationがある場合は、GM面談をマークして返す
      if (markGmInterview) {
        const now = new Date()

        // 未回答者（UNDECIDED）で動画+アンケート完了済みの場合、正式参加扱いにする
        const isUndecidedWithVideoSurveyDone =
          existingRegistration.participationIntent === 'UNDECIDED' &&
          existingRegistration.videoWatched &&
          existingRegistration.surveyCompleted

        const updateData: {
          isOverdue: boolean
          gmInterviewCompleted: boolean
          gmInterviewCompletedAt: Date
          gmInterviewCompletedBy: string
          attendanceMethod?: 'VIDEO_SURVEY'
          attendanceCompletedAt?: Date
          finalApproval?: FinalApprovalStatus
          finalApprovalAt?: Date
          finalApprovalBy?: string
        } = {
          isOverdue: true,
          gmInterviewCompleted: true,
          gmInterviewCompletedAt: now,
          gmInterviewCompletedBy: authUser!.id,
        }

        // 未回答者で動画+アンケート完了済みの場合
        // → GM面談完了をトリガーに正式参加扱い＋最終承認を維持に設定
        if (isUndecidedWithVideoSurveyDone) {
          updateData.attendanceMethod = 'VIDEO_SURVEY'
          updateData.attendanceCompletedAt = now
          updateData.finalApproval = 'MAINTAINED'
          updateData.finalApprovalAt = now
          updateData.finalApprovalBy = authUser!.id
        }

        const updated = await prisma.eventRegistration.update({
          where: { id: existingRegistration.id },
          data: updateData,
        })

        const message = isUndecidedWithVideoSurveyDone
          ? 'GM面談完了としてマークし、正式参加扱い＋最終承認（維持）を設定しました'
          : 'GM面談完了としてマークしました'

        return NextResponse.json({
          success: true,
          message,
          registration: {
            id: updated.id,
            gmInterviewCompleted: updated.gmInterviewCompleted,
            attendanceCompletedAt: updated.attendanceCompletedAt?.toISOString() ?? null,
            finalApproval: updated.finalApproval,
          },
        })
      }

      return NextResponse.json({
        success: true,
        message: '既存の登録情報があります',
        registration: {
          id: existingRegistration.id,
        },
      })
    }

    // 新規registrationを作成（期限超過フラグをセット）
    const now = new Date()
    const newRegistration = await prisma.eventRegistration.create({
      data: {
        userId,
        eventId,
        isOverdue: true,
        gmInterviewCompleted: markGmInterview ?? false,
        gmInterviewCompletedAt: markGmInterview ? now : null,
        gmInterviewCompletedBy: markGmInterview ? authUser!.id : null,
      },
    })

    return NextResponse.json({
      success: true,
      message: markGmInterview
        ? '登録を作成し、GM面談完了としてマークしました'
        : '登録を作成しました',
      registration: {
        id: newRegistration.id,
        gmInterviewCompleted: newRegistration.gmInterviewCompleted,
      },
    })
  } catch (error) {
    console.error('[CREATE_OVERDUE_REGISTRATION_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '登録情報の作成に失敗しました' },
      { status: 500 }
    )
  }
}
