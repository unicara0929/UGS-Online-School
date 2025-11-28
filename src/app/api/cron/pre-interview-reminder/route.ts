import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NotificationType, NotificationPriority } from '@prisma/client'
import { createNotification } from '@/lib/services/notification-service'
import { formatDateTime, formatDate } from '@/lib/utils/format'
import { Resend } from 'resend'

// 遅延初期化
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * 事前アンケート未提出リマインダー
 * GET /api/cron/pre-interview-reminder
 *
 * Vercel Cronまたは外部サービスから定期実行される想定
 * - 面談の2日前にリマインドを送信（未提出の場合）
 * - 面談の前日にも再リマインドを送信（未提出の場合）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（Vercel CronはAUTHORIZATIONヘッダーで認証）
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // 開発環境では認証をスキップ
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const now = new Date()
    const twoDaysLater = new Date(now)
    twoDaysLater.setDate(twoDaysLater.getDate() + 2)
    twoDaysLater.setHours(23, 59, 59, 999)

    const oneDayLater = new Date(now)
    oneDayLater.setDate(oneDayLater.getDate() + 1)
    oneDayLater.setHours(23, 59, 59, 999)

    // 未提出で、面談が近づいているアンケートを取得
    const pendingResponses = await prisma.preInterviewResponse.findMany({
      where: {
        status: 'PENDING',
        lpMeeting: {
          status: 'SCHEDULED',
          scheduledAt: {
            gte: now,
            lte: twoDaysLater
          }
        }
      },
      include: {
        respondent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lpMeeting: {
          select: {
            id: true,
            scheduledAt: true,
            counselorName: true
          }
        }
      }
    })

    const results = {
      total: pendingResponses.length,
      reminded: 0,
      skipped: 0,
      errors: [] as string[]
    }

    const resend = getResend()

    for (const response of pendingResponses) {
      try {
        const meetingDate = new Date(response.lpMeeting.scheduledAt!)
        const daysUntilMeeting = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // 2日前または1日前のリマインド
        // reminderSentAtが未設定、または前回から12時間以上経過している場合に送信
        const shouldSendReminder = !response.reminderSentAt ||
          (now.getTime() - new Date(response.reminderSentAt).getTime() > 12 * 60 * 60 * 1000)

        if (!shouldSendReminder) {
          results.skipped++
          continue
        }

        // リマインドの緊急度を決定
        const isUrgent = daysUntilMeeting <= 1
        const priority = isUrgent ? NotificationPriority.CRITICAL : NotificationPriority.INFO

        // アプリ内通知を送信
        await createNotification(
          response.respondentId,
          NotificationType.PRE_INTERVIEW_REMINDER,
          priority,
          isUrgent ? '【重要】事前アンケート未提出のお知らせ' : '事前アンケートのリマインド',
          isUrgent
            ? `明日のLP面談（${formatDateTime(meetingDate)}）の事前アンケートがまだ未提出です。至急ご回答をお願いいたします。`
            : `LP面談（${formatDateTime(meetingDate)}）の事前アンケートが未提出です。面談前日までにご回答をお願いいたします。`,
          `/dashboard/pre-interview/${response.id}`
        )

        // メール通知を送信
        try {
          await resend.emails.send({
            from: 'UGSオンラインスクール <inc@unicara.jp>',
            to: response.respondent.email,
            subject: isUrgent
              ? '【重要】LP面談・事前アンケート未提出のお知らせ'
              : '【リマインド】LP面談・事前アンケートのお願い',
            html: `
              <p>${response.respondent.name} さん</p>
              <br>
              ${isUrgent ? '<p style="color: #dc2626; font-weight: bold;">明日に面談を控えておりますが、事前アンケートがまだ未提出です。</p>' : ''}
              <p>LP面談の事前アンケートへのご回答がまだお済みでないようです。</p>
              <br>
              <p>─────────────────</p>
              <p><strong>■ 面談日時</strong><br>${formatDateTime(meetingDate)}</p>
              <br>
              <p><strong>■ 面談担当者</strong><br>${response.lpMeeting.counselorName}</p>
              <br>
              <p><strong>■ 回答期限</strong><br>${response.dueDate ? formatDate(response.dueDate) : '面談前日まで'}</p>
              <p>─────────────────</p>
              <br>
              <p>下記のリンクよりご回答ください。</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pre-interview/${response.id}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">事前アンケートに回答する</a></p>
              <br>
              <p>※回答は途中保存が可能です。</p>
              ${isUrgent ? '<p style="color: #dc2626;">※面談までにご回答いただけない場合、面談の進行に支障が出る可能性があります。</p>' : ''}
            `
          })
          console.log('[リマインダー] メール送信成功:', response.respondent.email)
        } catch (emailError) {
          console.error('[リマインダー] メール送信失敗:', emailError)
        }

        // リマインダー送信日時を更新
        await prisma.preInterviewResponse.update({
          where: { id: response.id },
          data: { reminderSentAt: now }
        })

        results.reminded++
      } catch (error: any) {
        console.error('[リマインダー] 処理エラー:', error)
        results.errors.push(`${response.respondent.email}: ${error.message}`)
      }
    }

    console.log('[リマインダー] 処理完了:', results)

    return NextResponse.json({
      success: true,
      ...results
    })
  } catch (error: any) {
    console.error('[リマインダー] APIエラー:', error)
    return NextResponse.json(
      { error: 'リマインダー処理に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}
