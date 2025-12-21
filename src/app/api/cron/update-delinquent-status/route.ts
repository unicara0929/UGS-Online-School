import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { NotificationType, NotificationPriority } from '@prisma/client'
import { createNotification } from '@/lib/services/notification-service'
import { formatDateTime, formatDate } from '@/lib/utils/format'
import { Resend } from 'resend'

// 遅延初期化
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * Cron Job: 毎日実行されるバッチ処理
 *
 * 実行内容:
 * 1. 長期滞納ステータス自動更新（PAST_DUE → DELINQUENT）
 * 2. 事前アンケート未提出リマインダー送信
 *
 * このエンドポイントは以下の方法で定期実行できます：
 * 1. Vercel Cron Jobs (vercel.json で設定)
 * 2. 外部のcronサービス (cron-job.org, EasyCron など)
 * 3. GitHub Actions (scheduled workflow)
 *
 * セキュリティ: CRON_SECRET環境変数で認証
 */
export async function GET(request: NextRequest) {
  try {
    // セキュリティチェック: CRON_SECRET で認証
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 7日前の日時を計算
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // PAST_DUE状態が7日以上続いているユーザーを取得
    const usersToUpdate = await prisma.user.findMany({
      where: {
        membershipStatus: 'PAST_DUE',
        delinquentSince: {
          lte: sevenDaysAgo // 7日以上前にPAST_DUEになった
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        delinquentSince: true,
      }
    })

    if (usersToUpdate.length === 0) {
      console.log('No users to update to DELINQUENT status')
      return NextResponse.json({
        success: true,
        message: 'No users to update',
        updatedCount: 0,
      })
    }

    // ユーザーをDELINQUENTステータスに更新
    const updateResults = await Promise.all(
      usersToUpdate.map(async (user) => {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              membershipStatus: 'DELINQUENT',
              membershipStatusChangedAt: new Date(),
              membershipStatusReason: '7日間の支払い遅延により長期滞納状態に移行',
            }
          })

          console.log(`Updated user ${user.email} to DELINQUENT status`)

          // TODO: 長期滞納通知メールを送信
          // await sendDelinquentNotificationEmail({
          //   to: user.email,
          //   userName: user.name,
          // })

          return { success: true, userId: user.id, email: user.email }
        } catch (error) {
          console.error(`Failed to update user ${user.email}:`, error)
          return { success: false, userId: user.id, email: user.email, error }
        }
      })
    )

    const successCount = updateResults.filter(r => r.success).length
    const failureCount = updateResults.filter(r => !r.success).length

    console.log(`DELINQUENT status update completed: ${successCount} success, ${failureCount} failed`)

    // ========================================
    // 2. 事前アンケート未提出リマインダー送信
    // ========================================
    const reminderResults = await sendPreInterviewReminders()

    return NextResponse.json({
      success: true,
      delinquentUpdate: {
        message: 'DELINQUENT status update completed',
        updatedCount: successCount,
        failedCount: failureCount,
        details: updateResults,
      },
      preInterviewReminder: reminderResults,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * 事前アンケート未提出リマインダー送信
 */
async function sendPreInterviewReminders() {
  const results = {
    total: 0,
    reminded: 0,
    skipped: 0,
    errors: [] as string[]
  }

  try {
    const now = new Date()
    const twoDaysLater = new Date(now)
    twoDaysLater.setDate(twoDaysLater.getDate() + 2)
    twoDaysLater.setHours(23, 59, 59, 999)

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

    results.total = pendingResponses.length
    const resend = getResend()

    for (const response of pendingResponses) {
      try {
        const meetingDate = new Date(response.lpMeeting.scheduledAt!)
        const daysUntilMeeting = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // reminderSentAtが未設定、または前回から12時間以上経過している場合に送信
        const shouldSendReminder = !response.reminderSentAt ||
          (now.getTime() - new Date(response.reminderSentAt).getTime() > 12 * 60 * 60 * 1000)

        if (!shouldSendReminder) {
          results.skipped++
          continue
        }

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
            from: 'UGS <inc@unicara.jp>',
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
  } catch (error: any) {
    console.error('[リマインダー] 全体エラー:', error)
    results.errors.push(error.message)
  }

  return results
}

/**
 * POST method for manual execution (admin only)
 */
export async function POST(request: NextRequest) {
  // 管理者のみ手動実行可能
  const { user: authUser, error: authError } = await getAuthenticatedUser(request)
  if (authError) return authError

  const { error: adminError } = checkAdmin(authUser!.role)
  if (adminError) return adminError

  // 管理者認証済みなので、CRON_SECRETチェックをスキップするため
  // 新しいリクエストを作成してAuthorizationヘッダーを設定
  const modifiedRequest = new NextRequest(request.url, {
    headers: {
      ...Object.fromEntries(request.headers),
      'authorization': `Bearer ${process.env.CRON_SECRET || 'admin-manual-execution'}`
    }
  })

  return GET(modifiedRequest)
}
