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

    // 全FPエイドを取得
    const fpUsers = await prisma.user.findMany({
      where: {
        role: 'FP',
      },
      select: {
        id: true,
        name: true,
        email: true,
        memberId: true,
      },
      orderBy: { name: 'asc' }
    })

    // このイベントへの登録情報を取得
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId },
      select: {
        userId: true,
        paymentStatus: true,
        attendanceMethod: true,
        attendanceCompletedAt: true,
        videoWatched: true,
        surveyCompleted: true,
        createdAt: true,
      }
    })

    // 免除申請を取得
    const exemptions = await prisma.mtgExemption.findMany({
      where: { eventId },
      select: {
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

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        memberId: user.memberId,
        status,
        statusLabel,
        // 登録情報
        isRegistered: !!registration,
        registeredAt: registration?.createdAt?.toISOString() ?? null,
        // 出席確認
        attendanceMethod: registration?.attendanceMethod ?? null,
        attendanceCompletedAt: registration?.attendanceCompletedAt?.toISOString() ?? null,
        videoWatched: registration?.videoWatched ?? false,
        surveyCompleted: registration?.surveyCompleted ?? false,
        // 免除申請
        hasExemption: !!exemption,
        exemptionStatus: exemption?.status ?? null,
        exemptionReason: exemption?.reason ?? null,
      }
    })

    // ステータス別の集計
    const summary = {
      total: participants.length,
      attended: participants.filter(p => p.status === 'attended_code' || p.status === 'attended_video').length,
      exempted: participants.filter(p => p.status === 'exempted').length,
      registered: participants.filter(p => p.status === 'registered').length,
      videoIncomplete: participants.filter(p => p.status === 'video_incomplete').length,
      notResponded: participants.filter(p => p.status === 'not_responded').length,
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
