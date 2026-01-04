import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LPMeetingStatus, NotificationType, NotificationPriority } from '@prisma/client'
import { createNotification } from '@/lib/services/notification-service'
import { formatDateTime } from '@/lib/utils/format'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { Resend } from 'resend'

// 遅延初期化（ビルド時のエラーを回避）
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * 面談をキャンセル（管理者）
 * POST /api/admin/lp-meetings/{meetingId}/cancel
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ meetingId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) return adminError!

    const { meetingId } = await context.params
    const body = await request.json().catch(() => ({}))
    const { reason } = body

    // 面談を取得
    const meeting = await prisma.lPMeeting.findUnique({
      where: { id: meetingId },
      include: {
        member: true
      }
    })

    if (!meeting) {
      return NextResponse.json(
        { error: '面談が見つかりません' },
        { status: 404 }
      )
    }

    if (meeting.status === 'COMPLETED' || meeting.status === 'CANCELLED' || meeting.status === 'NO_SHOW') {
      return NextResponse.json(
        { error: 'この面談は既に完了、キャンセル、またはノーショー状態です' },
        { status: 400 }
      )
    }

    // 面談をキャンセルに更新
    const updatedMeeting = await prisma.lPMeeting.update({
      where: { id: meetingId },
      data: {
        status: LPMeetingStatus.CANCELLED,
        cancelledAt: new Date(),
        notes: reason ? `${meeting.notes ? meeting.notes + '\n' : ''}キャンセル理由: ${reason}` : meeting.notes
      },
      include: {
        member: true
      }
    })

    // メンバーにアプリ内通知を送信
    await createNotification(
      updatedMeeting.memberId,
      NotificationType.LP_MEETING_SCHEDULED, // LP_MEETING_CANCELLED がないので代用
      NotificationPriority.INFO,
      'LP面談がキャンセルされました',
      `LP面談がキャンセルされました。${reason ? `理由: ${reason}` : ''}再度申請する場合は、LP面談申請ページからお申し込みください。`,
      '/dashboard/lp-meeting/request'
    )

    // メンバーにメール通知を送信
    try {
      const resend = getResend()
      await resend.emails.send({
        from: 'UGS <inc@unicara.jp>',
        to: updatedMeeting.member.email,
        subject: '【LP面談】キャンセルのお知らせ',
        html: `
          <p>${updatedMeeting.member.name} さん</p>
          <br>
          <p>LP面談がキャンセルされました。</p>
          <br>
          <p>─────────────────</p>
          ${meeting.scheduledAt ? `<p><strong>■ 面談予定日時</strong><br>${formatDateTime(meeting.scheduledAt)}</p><br>` : ''}
          ${meeting.counselorName ? `<p><strong>■ 面談担当者</strong><br>${meeting.counselorName}</p><br>` : ''}
          ${reason ? `<p><strong>■ キャンセル理由</strong><br>${reason}</p><br>` : ''}
          <p>─────────────────</p>
          <br>
          <p>再度LP面談をご希望の場合は、下記のリンクからお申し込みください。</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/lp-meeting/request" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">LP面談を申請する</a></p>
        `
      })
      console.log('[LP面談キャンセル通知] メール送信成功:', updatedMeeting.member.email)
    } catch (emailError) {
      console.error('[LP面談キャンセル通知] メール送信失敗:', emailError)
      // メール送信失敗してもエラーにしない
    }

    // 面談者にもメール通知（確定済みの場合のみ）
    if (meeting.counselorEmail && meeting.status === 'SCHEDULED') {
      try {
        const resend = getResend()
        await resend.emails.send({
          from: 'UGS <inc@unicara.jp>',
          to: meeting.counselorEmail,
          subject: `【LP面談キャンセル】${updatedMeeting.member.name}様の面談がキャンセルされました`,
          html: `
            <p>${meeting.counselorName} さん</p>
            <br>
            <p>以下のLP面談がキャンセルされました。</p>
            <br>
            <p>─────────────────</p>
            <p><strong>■ 申込者名</strong><br>${updatedMeeting.member.name}</p>
            <br>
            ${meeting.scheduledAt ? `<p><strong>■ 面談予定日時</strong><br>${formatDateTime(meeting.scheduledAt)}</p><br>` : ''}
            ${reason ? `<p><strong>■ キャンセル理由</strong><br>${reason}</p><br>` : ''}
            <p>─────────────────</p>
          `
        })
        console.log('[LP面談キャンセル通知] 面談者へのメール送信成功:', meeting.counselorEmail)
      } catch (emailError) {
        console.error('[LP面談キャンセル通知] 面談者へのメール送信失敗:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: updatedMeeting.id,
        memberId: updatedMeeting.memberId,
        status: updatedMeeting.status,
        scheduledAt: updatedMeeting.scheduledAt,
        cancelledAt: updatedMeeting.cancelledAt,
        counselorName: updatedMeeting.counselorName,
        member: updatedMeeting.member
      }
    })
  } catch (error: any) {
    console.error('LP面談キャンセルエラー:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '面談が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '面談のキャンセル処理に失敗しました' },
      { status: 500 }
    )
  }
}
