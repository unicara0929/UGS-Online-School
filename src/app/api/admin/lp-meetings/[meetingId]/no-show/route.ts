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
 * 面談をノーショー（無断欠席）処理（管理者）
 * POST /api/admin/lp-meetings/{meetingId}/no-show
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
    const { notes } = body

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

    if (meeting.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: 'この面談は確定済み（SCHEDULED）ステータスではありません' },
        { status: 400 }
      )
    }

    // 面談をノーショーに更新
    const updatedMeeting = await prisma.lPMeeting.update({
      where: { id: meetingId },
      data: {
        status: LPMeetingStatus.NO_SHOW,
        notes: notes ? `${meeting.notes ? meeting.notes + '\n' : ''}ノーショー備考: ${notes}` : meeting.notes
      },
      include: {
        member: true
      }
    })

    // 事前アンケートがあれば削除
    await prisma.preInterviewResponse.deleteMany({
      where: { lpMeetingId: meetingId }
    })

    // メンバーにアプリ内通知を送信
    await createNotification(
      updatedMeeting.memberId,
      NotificationType.LP_MEETING_SCHEDULED, // LP_MEETING_NO_SHOW がないので代用
      NotificationPriority.CRITICAL,
      'LP面談に出席されませんでした',
      `予定されていたLP面談に出席が確認できませんでした。再度申請される場合は、LP面談申請ページからお申し込みください。`,
      '/dashboard/lp-meeting/request'
    )

    // メンバーにメール通知を送信
    try {
      const resend = getResend()
      await resend.emails.send({
        from: 'UGSオンラインスクール <inc@unicara.jp>',
        to: updatedMeeting.member.email,
        subject: '【LP面談】出席確認のお知らせ',
        html: `
          <p>${updatedMeeting.member.name} さん</p>
          <br>
          <p>予定されていたLP面談に出席が確認できませんでした。</p>
          <br>
          <p>─────────────────</p>
          ${meeting.scheduledAt ? `<p><strong>■ 面談予定日時</strong><br>${formatDateTime(meeting.scheduledAt)}</p><br>` : ''}
          ${meeting.counselorName ? `<p><strong>■ 面談担当者</strong><br>${meeting.counselorName}</p><br>` : ''}
          <p>─────────────────</p>
          <br>
          <p>ご都合が合わなかった場合は、再度下記のリンクからLP面談をお申し込みいただけます。</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/lp-meeting/request" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">LP面談を申請する</a></p>
          <br>
          <p>ご不明な点がございましたら、お問い合わせください。</p>
        `
      })
      console.log('[LP面談ノーショー通知] メール送信成功:', updatedMeeting.member.email)
    } catch (emailError) {
      console.error('[LP面談ノーショー通知] メール送信失敗:', emailError)
      // メール送信失敗してもエラーにしない
    }

    // 面談者にもメール通知
    if (meeting.counselorEmail) {
      try {
        const resend = getResend()
        await resend.emails.send({
          from: 'UGSオンラインスクール <inc@unicara.jp>',
          to: meeting.counselorEmail,
          subject: `【LP面談ノーショー】${updatedMeeting.member.name}様が面談に出席されませんでした`,
          html: `
            <p>${meeting.counselorName} さん</p>
            <br>
            <p>以下のLP面談において、申込者の出席が確認できませんでした。</p>
            <br>
            <p>─────────────────</p>
            <p><strong>■ 申込者名</strong><br>${updatedMeeting.member.name}</p>
            <br>
            ${meeting.scheduledAt ? `<p><strong>■ 面談予定日時</strong><br>${formatDateTime(meeting.scheduledAt)}</p><br>` : ''}
            <p>─────────────────</p>
            <br>
            <p>本面談はノーショーとして処理されました。</p>
          `
        })
        console.log('[LP面談ノーショー通知] 面談者へのメール送信成功:', meeting.counselorEmail)
      } catch (emailError) {
        console.error('[LP面談ノーショー通知] 面談者へのメール送信失敗:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: updatedMeeting.id,
        memberId: updatedMeeting.memberId,
        status: updatedMeeting.status,
        scheduledAt: updatedMeeting.scheduledAt,
        counselorName: updatedMeeting.counselorName,
        member: updatedMeeting.member
      }
    })
  } catch (error: any) {
    console.error('LP面談ノーショーエラー:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '面談が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '面談のノーショー処理に失敗しました' },
      { status: 500 }
    )
  }
}
