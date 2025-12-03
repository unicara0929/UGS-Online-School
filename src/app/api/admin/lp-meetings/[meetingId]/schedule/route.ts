import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LPMeetingStatus, MeetingPlatform, NotificationType, NotificationPriority, PreInterviewStatus } from '@prisma/client'
import { createNotification } from '@/lib/services/notification-service'
import { formatDateTime, formatDate } from '@/lib/utils/format'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { Resend } from 'resend'

// 遅延初期化（ビルド時のエラーを回避）
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * 面談を確定（管理者）
 * POST /api/admin/lp-meetings/{meetingId}/schedule
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
    const { scheduledAt, counselorName, counselorEmail, meetingUrl, meetingPlatform, assignedBy } = await request.json()

    if (!scheduledAt || !counselorName || !counselorEmail || !meetingUrl || !meetingPlatform || !assignedBy) {
      return NextResponse.json(
        { error: '確定日時、面談者名、面談者メールアドレス、面談URL、プラットフォーム、管理者IDが必要です' },
        { status: 400 }
      )
    }

    // 面談を取得
    const meeting = await prisma.lPMeeting.findUnique({
      where: { id: meetingId },
      include: {
        member: true,
        fp: true
      }
    })

    if (!meeting) {
      return NextResponse.json(
        { error: '面談が見つかりません' },
        { status: 404 }
      )
    }

    if (meeting.status !== 'REQUESTED') {
      return NextResponse.json(
        { error: 'この面談は既に確定済みまたはキャンセル済みです' },
        { status: 400 }
      )
    }

    // 希望日時に含まれているか確認
    const preferredDates = meeting.preferredDates as string[]
    const scheduledAtDate = new Date(scheduledAt).toISOString()
    const isPreferredDate = preferredDates.some(date => {
      const preferredDate = new Date(date).toISOString()
      // 日付部分のみを比較（時刻は無視）
      return preferredDate.split('T')[0] === scheduledAtDate.split('T')[0]
    })

    if (!isPreferredDate) {
      return NextResponse.json(
        { error: '確定日時は希望日時のいずれかから選択してください' },
        { status: 400 }
      )
    }

    // 面談を確定
    const updatedMeeting = await prisma.lPMeeting.update({
      where: { id: meetingId },
      data: {
        status: LPMeetingStatus.SCHEDULED,
        scheduledAt: new Date(scheduledAt),
        counselorName,
        counselorEmail,
        meetingUrl,
        meetingPlatform: meetingPlatform as MeetingPlatform,
        assignedBy
      },
      include: {
        member: true,
        fp: true
      }
    })

    // メンバーに通知を送信
    await createNotification(
      updatedMeeting.memberId,
      NotificationType.LP_MEETING_SCHEDULED,
      NotificationPriority.INFO,
      'LP面談が確定しました',
      `${formatDateTime(new Date(scheduledAt))}に${counselorName}さんとのLP面談が確定しました。オンライン面談のURL: ${meetingUrl}`,
      '/dashboard/lp-meeting/request'
    )

    // 事前アンケートを自動作成
    let preInterviewResponse = null
    try {
      // アクティブなテンプレートを取得
      const activeTemplate = await prisma.preInterviewTemplate.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })

      if (activeTemplate) {
        // 回答期限は面談日の前日
        const scheduledDate = new Date(scheduledAt)
        const dueDate = new Date(scheduledDate)
        dueDate.setDate(dueDate.getDate() - 1)
        dueDate.setHours(23, 59, 59, 999)

        // 事前アンケート回答セッションを作成
        preInterviewResponse = await prisma.preInterviewResponse.create({
          data: {
            templateId: activeTemplate.id,
            lpMeetingId: meetingId,
            respondentId: updatedMeeting.memberId,
            status: PreInterviewStatus.PENDING,
            dueDate,
            notificationSentAt: new Date()
          }
        })

        // メンバーにアプリ内通知を送信
        await createNotification(
          updatedMeeting.memberId,
          NotificationType.PRE_INTERVIEW_REQUESTED,
          NotificationPriority.INFO,
          '事前アンケートのお願い',
          `LP面談前の事前アンケートにご回答ください。回答期限: ${formatDate(dueDate)}`,
          '/dashboard/pre-interview'
        )

        // メンバーにメール通知を送信
        const resend = getResend()
        try {
          await resend.emails.send({
            from: 'Unicara Growth Salon <inc@unicara.jp>',
            to: updatedMeeting.member.email,
            subject: '【LP面談】事前アンケートのお願い',
            html: `
              <p>${updatedMeeting.member.name} さん</p>
              <br>
              <p>LP面談が確定しました。面談前に事前アンケートへのご回答をお願いいたします。</p>
              <br>
              <p>─────────────────</p>
              <p><strong>■ 面談日時</strong><br>${formatDateTime(scheduledDate)}</p>
              <br>
              <p><strong>■ 面談担当者</strong><br>${counselorName}</p>
              <br>
              <p><strong>■ アンケート回答期限</strong><br>${formatDate(dueDate)}</p>
              <p>─────────────────</p>
              <br>
              <p>下記のリンクよりご回答ください。</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pre-interview">事前アンケートに回答する</a></p>
              <br>
              <p>※回答は途中保存が可能です。</p>
            `
          })
          console.log('[事前アンケート通知] メール送信成功:', updatedMeeting.member.email)
        } catch (emailError) {
          console.error('[事前アンケート通知] メール送信失敗:', emailError)
        }
      }
    } catch (preInterviewError) {
      console.error('事前アンケート作成エラー:', preInterviewError)
      // 事前アンケート作成失敗しても面談確定は成功とする
    }

    // 面談者にメール通知を送信
    try {
      console.log('[メール送信] 開始:', { counselorEmail, counselorName })

      const resend = getResend()
      const formattedDate = formatDateTime(new Date(scheduledAt))
      const platformName = meetingPlatform === 'ZOOM' ? 'Zoom' :
                          meetingPlatform === 'GOOGLE_MEET' ? 'Google Meet' :
                          meetingPlatform === 'TEAMS' ? 'Microsoft Teams' : 'その他'

      console.log('[メール送信] パラメータ:', {
        from: 'Unicara Growth Salon <inc@unicara.jp>',
        to: counselorEmail,
        subject: `【LP面談依頼】${updatedMeeting.member.name}様の面談が確定しました`,
        hasApiKey: !!process.env.RESEND_API_KEY
      })

      const result = await resend.emails.send({
        from: 'Unicara Growth Salon <inc@unicara.jp>',
        to: counselorEmail,
        subject: `【LP面談依頼】${updatedMeeting.member.name}様の面談が確定しました`,
        html: `
          <p>${counselorName} さん</p>
          <br>
          <p>以下の内容でLP面談が確定しました。</p>
          <br>
          <p>─────────────────</p>
          <p><strong>■ 申込者名</strong><br>${updatedMeeting.member.name}</p>
          <br>
          <p><strong>■ 申込者メールアドレス</strong><br>${updatedMeeting.member.email}</p>
          <br>
          <p><strong>■ 面談日時</strong><br>${formattedDate}</p>
          <br>
          <p><strong>■ 面談場所</strong><br>${platformName}: ${meetingUrl}</p>
          <br>
          ${meeting.memberNotes ? `<p><strong>■ 申込者からの備考</strong><br>${meeting.memberNotes}</p><br>` : ''}
          <p>─────────────────</p>
          <br>
          <p>詳細は管理画面よりご確認ください。</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/lp-meetings">管理画面を開く</a></p>
        `
      })
      console.log('[メール送信] 成功:', { counselorEmail, result })
    } catch (emailError: any) {
      console.error('[メール送信] 失敗:', {
        counselorEmail,
        error: emailError.message,
        stack: emailError.stack,
        details: emailError
      })
      // メール送信失敗してもエラーにしない（面談確定は成功）
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: updatedMeeting.id,
        memberId: updatedMeeting.memberId,
        fpId: updatedMeeting.fpId,
        counselorName: updatedMeeting.counselorName,
        counselorEmail: updatedMeeting.counselorEmail,
        status: updatedMeeting.status,
        scheduledAt: updatedMeeting.scheduledAt,
        meetingUrl: updatedMeeting.meetingUrl,
        meetingPlatform: updatedMeeting.meetingPlatform,
        member: updatedMeeting.member,
        fp: updatedMeeting.fp
      }
    })
  } catch (error: any) {
    console.error('LP面談確定エラー:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '面談が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '面談の確定に失敗しました' },
      { status: 500 }
    )
  }
}
