import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { FinalApprovalStatus } from '@prisma/client'

/**
 * 全体MTG参加登録管理API（管理者用）
 *
 * PATCH: GM面談完了マーク / 最終承認設定
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { registrationId } = await params
    const body = await request.json()
    const { action, finalApproval } = body as {
      action?: 'gm_interview' | 'final_approval'
      finalApproval?: 'MAINTAINED' | 'DEMOTED'
    }

    // 既存の登録を取得
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            memberId: true,
          },
        },
        event: {
          select: {
            title: true,
          },
        },
      },
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { success: false, error: '登録情報が見つかりません' },
        { status: 404 }
      )
    }

    const now = new Date()

    // GM面談完了マーク
    if (action === 'gm_interview') {
      // 未回答者（UNDECIDED）で動画+アンケート完了済みの場合、正式参加扱いにする
      const isUndecidedWithVideoSurveyDone =
        existingRegistration.participationIntent === 'UNDECIDED' &&
        existingRegistration.videoWatched &&
        existingRegistration.surveyCompleted

      const updateData: {
        gmInterviewCompleted: boolean
        gmInterviewCompletedAt: Date
        gmInterviewCompletedBy: string
        attendanceMethod?: 'VIDEO_SURVEY'
        attendanceCompletedAt?: Date
        finalApproval?: FinalApprovalStatus
        finalApprovalAt?: Date
        finalApprovalBy?: string
      } = {
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

      const updatedRegistration = await prisma.eventRegistration.update({
        where: { id: registrationId },
        data: updateData,
      })

      const message = isUndecidedWithVideoSurveyDone
        ? 'GM面談完了としてマークし、正式参加扱い＋最終承認（維持）を設定しました'
        : 'GM面談完了としてマークしました'

      return NextResponse.json({
        success: true,
        message,
        registration: {
          id: updatedRegistration.id,
          gmInterviewCompleted: updatedRegistration.gmInterviewCompleted,
          gmInterviewCompletedAt: updatedRegistration.gmInterviewCompletedAt?.toISOString() ?? null,
          attendanceCompletedAt: updatedRegistration.attendanceCompletedAt?.toISOString() ?? null,
          finalApproval: updatedRegistration.finalApproval,
        },
      })
    }

    // 最終承認設定
    if (action === 'final_approval') {
      if (!finalApproval || !['MAINTAINED', 'DEMOTED'].includes(finalApproval)) {
        return NextResponse.json(
          { success: false, error: '最終承認は MAINTAINED または DEMOTED を指定してください' },
          { status: 400 }
        )
      }

      const updatedRegistration = await prisma.eventRegistration.update({
        where: { id: registrationId },
        data: {
          finalApproval: finalApproval as FinalApprovalStatus,
          finalApprovalAt: now,
          finalApprovalBy: authUser!.id,
        },
      })

      const statusLabel = finalApproval === 'MAINTAINED' ? '維持' : '降格'

      return NextResponse.json({
        success: true,
        message: `最終承認を「${statusLabel}」に設定しました`,
        registration: {
          id: updatedRegistration.id,
          finalApproval: updatedRegistration.finalApproval,
          finalApprovalAt: updatedRegistration.finalApprovalAt?.toISOString() ?? null,
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'action は gm_interview または final_approval を指定してください' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[PATCH_MTG_REGISTRATION_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '登録情報の更新に失敗しました' },
      { status: 500 }
    )
  }
}
