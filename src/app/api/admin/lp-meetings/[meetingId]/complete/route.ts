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
 * 面談を完了（管理者）
 * POST /api/admin/lp-meetings/{meetingId}/complete
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

    // 面談を完了に更新
    const updatedMeeting = await prisma.lPMeeting.update({
      where: { id: meetingId },
      data: {
        status: LPMeetingStatus.COMPLETED,
        completedAt: new Date(),
        notes: notes || meeting.notes
      },
      include: {
        member: true
      }
    })

    // FPPromotionApplicationのlpMeetingCompletedをtrueに更新（存在しない場合は作成）
    try {
      await prisma.fPPromotionApplication.update({
        where: { userId: meeting.memberId },
        data: { lpMeetingCompleted: true }
      })
    } catch (error: any) {
      // FPPromotionApplicationが存在しない場合は作成
      if (error.code === 'P2025') {
        await prisma.fPPromotionApplication.create({
          data: {
            userId: meeting.memberId,
            lpMeetingCompleted: true
          }
        })
      }
    }

    // メンバーにアプリ内通知を送信
    await createNotification(
      updatedMeeting.memberId,
      NotificationType.LP_MEETING_COMPLETED,
      NotificationPriority.SUCCESS,
      'LP面談が完了しました',
      `LP面談が完了しました。ご参加いただきありがとうございました。`,
      '/dashboard/promotion'
    )

    // メンバーにメール通知を送信
    try {
      const resend = getResend()
      await resend.emails.send({
        from: 'UGSオンラインスクール <inc@unicara.jp>',
        to: updatedMeeting.member.email,
        subject: '【LP面談完了】ご参加ありがとうございました',
        html: `
          <p>${updatedMeeting.member.name} さん</p>
          <br>
          <p>LP面談が完了しました。ご参加いただきありがとうございました。</p>
          <br>
          <p>─────────────────</p>
          <p><strong>■ 面談日時</strong><br>${meeting.scheduledAt ? formatDateTime(meeting.scheduledAt) : '---'}</p>
          <br>
          <p><strong>■ 面談担当者</strong><br>${meeting.counselorName || '---'}</p>
          <p>─────────────────</p>
          <br>
          <p>引き続きFPエイド昇格に向けて、次のステップにお進みください。</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/promotion" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">FPエイド昇格ページを確認する</a></p>
        `
      })
      console.log('[LP面談完了通知] メール送信成功:', updatedMeeting.member.email)
    } catch (emailError) {
      console.error('[LP面談完了通知] メール送信失敗:', emailError)
      // メール送信失敗してもエラーにしない
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: updatedMeeting.id,
        memberId: updatedMeeting.memberId,
        status: updatedMeeting.status,
        scheduledAt: updatedMeeting.scheduledAt,
        completedAt: updatedMeeting.completedAt,
        counselorName: updatedMeeting.counselorName,
        member: updatedMeeting.member
      }
    })
  } catch (error: any) {
    console.error('LP面談完了エラー:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '面談が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '面談の完了処理に失敗しました' },
      { status: 500 }
    )
  }
}
