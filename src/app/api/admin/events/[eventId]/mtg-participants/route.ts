import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * 全体MTG参加者一覧取得 API
 * 全FPエイドをリストアップし、各人のステータスを返す
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    const { eventId } = await context.params

    // イベント情報を取得
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        date: true,
        time: true,
        status: true,
        isRecurring: true,
        attendanceCode: true,
        vimeoUrl: true,
        surveyUrl: true,
        materialsUrl: true,
        attendanceDeadline: true,
      }
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    if (!event.isRecurring) {
      return NextResponse.json(
        { success: false, error: 'このイベントは全体MTGではありません' },
        { status: 400 }
      )
    }

    // 全FPエイドを取得（サブスクリプション情報も含む）
    const fpUsers = await prisma.user.findMany({
      where: {
        role: 'FP',
      },
      select: {
        id: true,
        name: true,
        email: true,
        memberId: true,
        subscriptions: {
          select: {
            status: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' }
    })

    // このイベントへの登録情報を取得
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        userId: true,
        paymentStatus: true,
        attendanceMethod: true,
        attendanceCompletedAt: true,
        videoWatched: true,
        videoCompletedAt: true,
        surveyCompleted: true,
        surveyCompletedAt: true,
        participationIntent: true,
        participationIntentAt: true,
        isOverdue: true,
        gmInterviewCompleted: true,
        gmInterviewCompletedAt: true,
        finalApproval: true,
        finalApprovalAt: true,
        createdAt: true,
      }
    })

    // 免除申請を取得
    const exemptions = await prisma.mtgExemption.findMany({
      where: { eventId },
      select: {
        id: true,
        userId: true,
        reason: true,
        status: true,
        createdAt: true,
      }
    })

    // 登録情報と免除申請をマップ化
    const registrationMap = new Map(registrations.map(r => [r.userId, r]))
    const exemptionMap = new Map(exemptions.map(e => [e.userId, e]))

    // 各FPエイドのステータスを計算
    const participants = fpUsers.map(user => {
      const registration = registrationMap.get(user.id)
      const exemption = exemptionMap.get(user.id)

      let status: 'not_responded' | 'registered' | 'exempted' | 'attended_code' | 'attended_video' | 'video_incomplete'
      let statusLabel: string

      if (exemption && exemption.status === 'APPROVED') {
        status = 'exempted'
        statusLabel = '免除承認済み'
      } else if (exemption && exemption.status === 'PENDING') {
        status = 'exempted'
        statusLabel = '免除申請中'
      } else if (registration?.attendanceCompletedAt) {
        if (registration.attendanceMethod === 'CODE') {
          status = 'attended_code'
          statusLabel = '参加コード出席'
        } else {
          status = 'attended_video'
          statusLabel = '動画視聴出席'
        }
      } else if (registration?.videoWatched || registration?.surveyCompleted) {
        status = 'video_incomplete'
        statusLabel = '動画/アンケート途中'
      } else if (registration) {
        status = 'registered'
        statusLabel = '参加登録済み'
      } else {
        status = 'not_responded'
        statusLabel = '未対応'
      }

      // 月額費決済ステータスを判定
      const subscription = user.subscriptions[0]
      let paymentStatus: 'paid' | 'unpaid' | 'unknown' = 'unknown'
      if (subscription) {
        paymentStatus = subscription.status === 'ACTIVE' ? 'paid' : 'unpaid'
      }

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        memberId: user.memberId,
        status,
        statusLabel,
        // 登録情報
        registrationId: registration?.id ?? null,
        isRegistered: !!registration,
        registeredAt: registration?.createdAt?.toISOString() ?? null,
        // 月額費決済ステータス
        paymentStatus,
        // 参加意思
        participationIntent: registration?.participationIntent ?? 'UNDECIDED',
        participationIntentAt: registration?.participationIntentAt?.toISOString() ?? null,
        // 出席確認
        attendanceMethod: registration?.attendanceMethod ?? null,
        attendanceCompletedAt: registration?.attendanceCompletedAt?.toISOString() ?? null,
        videoWatched: registration?.videoWatched ?? false,
        videoCompletedAt: registration?.videoCompletedAt?.toISOString() ?? null,
        surveyCompleted: registration?.surveyCompleted ?? false,
        surveyCompletedAt: registration?.surveyCompletedAt?.toISOString() ?? null,
        // 期限超過・GM面談・最終承認
        isOverdue: registration?.isOverdue ?? false,
        gmInterviewCompleted: registration?.gmInterviewCompleted ?? false,
        gmInterviewCompletedAt: registration?.gmInterviewCompletedAt?.toISOString() ?? null,
        finalApproval: registration?.finalApproval ?? null,
        finalApprovalAt: registration?.finalApprovalAt?.toISOString() ?? null,
        // 免除申請
        hasExemption: !!exemption,
        exemptionId: exemption?.id ?? null,
        exemptionStatus: exemption?.status ?? null,
        exemptionReason: exemption?.reason ?? null,
      }
    })

    // 正式参加の判定（コード入力 or 動画+アンケート完了 or 免除承認）
    const officiallyAttended = participants.filter(p =>
      p.status === 'attended_code' ||
      p.status === 'attended_video' ||
      (p.hasExemption && p.exemptionStatus === 'APPROVED')
    ).length

    // ステータス別の集計
    const summary = {
      total: participants.length,
      // 正式参加（最重要指標）
      officiallyAttended,
      // 出席方法別
      attendedByCode: participants.filter(p => p.status === 'attended_code').length,
      attendedByVideo: participants.filter(p => p.status === 'attended_video').length,
      exemptedApproved: participants.filter(p => p.hasExemption && p.exemptionStatus === 'APPROVED').length,
      // 選択ステータス別
      willAttend: participants.filter(p => p.participationIntent === 'WILL_ATTEND' && !p.hasExemption).length,
      willNotAttend: participants.filter(p => p.participationIntent === 'WILL_NOT_ATTEND' && !p.hasExemption).length,
      exemptionRequested: participants.filter(p => p.hasExemption).length,
      undecided: participants.filter(p => p.participationIntent === 'UNDECIDED' && !p.hasExemption).length,
      // その他
      videoIncomplete: participants.filter(p => p.status === 'video_incomplete').length,
      notResponded: participants.filter(p => p.status === 'not_responded').length,
      // FPエイド維持判定用
      overdue: participants.filter(p => p.isOverdue).length,
      needGmInterview: participants.filter(p => p.isOverdue && !p.gmInterviewCompleted).length,
      maintained: participants.filter(p => p.finalApproval === 'MAINTAINED').length,
      demoted: participants.filter(p => p.finalApproval === 'DEMOTED').length,
      // 決済状況
      paymentPaid: participants.filter(p => p.paymentStatus === 'paid').length,
      paymentUnpaid: participants.filter(p => p.paymentStatus === 'unpaid').length,
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        date: event.date.toISOString(),
        time: event.time,
        status: event.status.toLowerCase(),
        hasAttendanceCode: !!event.attendanceCode,
        attendanceCode: event.attendanceCode, // 管理者には表示
        hasVideo: !!event.vimeoUrl,
        hasSurvey: !!event.surveyUrl,
        hasMaterials: !!event.materialsUrl,
        attendanceDeadline: event.attendanceDeadline?.toISOString() ?? null,
      },
      participants,
      summary,
    })
  } catch (error) {
    console.error('[MTG_PARTICIPANTS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '参加者情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
