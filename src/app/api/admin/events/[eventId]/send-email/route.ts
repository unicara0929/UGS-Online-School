import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { sendEmail } from '@/lib/services/email-service'

/**
 * イベント参加者一括メール送信API
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { eventId } = await context.params
    const body = await request.json()
    const { userIds, templateType, subject, customBody } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'ユーザーIDのリストが必要です' },
        { status: 400 }
      )
    }

    // イベント情報を取得
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 指定されたユーザーの登録情報を取得
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        eventId: eventId,
        userId: { in: userIds },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: '送信対象のユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // メール送信処理
    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    for (const registration of registrations) {
      try {
        let emailSubject = subject || ''
        let emailBody = customBody || ''

        // テンプレートタイプに応じてメール内容を生成
        if (templateType === 'payment_reminder') {
          emailSubject = `【支払い未完了】${event.title}の参加費をお支払いください`
          emailBody = generatePaymentReminderEmail(event, registration)
        } else if (templateType === 'event_reminder') {
          emailSubject = `【開催間近】${event.title}のリマインド`
          emailBody = generateEventReminderEmail(event, registration)
        } else if (templateType === 'custom') {
          // カスタムメールの場合はそのまま使用
          if (!subject || !customBody) {
            throw new Error('カスタムメールには件名と本文が必要です')
          }
        }

        await sendEmail({
          to: registration.user.email,
          subject: emailSubject,
          html: emailBody,
        })

        successCount++
      } catch (error) {
        console.error(`Failed to send email to ${registration.user.email}:`, error)
        failCount++
        errors.push(`${registration.user.email}: ${error instanceof Error ? error.message : '送信失敗'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${successCount}件のメールを送信しました${failCount > 0 ? `（${failCount}件失敗）` : ''}`,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: 'メール送信に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 支払いリマインドメールの本文を生成
 */
function generatePaymentReminderEmail(event: any, registration: any): string {
  const eventDate = new Date(event.date).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #334155;">お支払いのお願い</h2>

      <p>${registration.user.name} 様</p>

      <p>以下のイベントにお申し込みいただきありがとうございます。</p>

      <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #0f172a;">${event.title}</h3>
        <p style="margin: 5px 0;"><strong>開催日時:</strong> ${eventDate}</p>
        <p style="margin: 5px 0;"><strong>参加費:</strong> ¥${event.price?.toLocaleString()}</p>
      </div>

      <p style="color: #dc2626; font-weight: bold;">現在、お支払いが完了していません。</p>

      <p>下記のリンクから決済を完了してください：</p>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/events"
         style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
        支払いを完了する
      </a>

      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
        ※このメールにお心当たりがない場合は、お手数ですが削除してください。
      </p>
    </div>
  `
}

/**
 * イベントリマインドメールの本文を生成
 */
function generateEventReminderEmail(event: any, registration: any): string {
  const eventDate = new Date(event.date).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #334155;">イベント開催のリマインド</h2>

      <p>${registration.user.name} 様</p>

      <p>以下のイベントが間もなく開催されます。</p>

      <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #0f172a;">${event.title}</h3>
        <p style="margin: 5px 0;"><strong>開催日時:</strong> ${eventDate}</p>
        ${event.time ? `<p style="margin: 5px 0;"><strong>時間:</strong> ${event.time}</p>` : ''}
        ${event.location ? `<p style="margin: 5px 0;"><strong>場所:</strong> ${event.location}</p>` : ''}
      </div>

      <p>当日お待ちしております！</p>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/events"
         style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
        イベント詳細を見る
      </a>

      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
        ご不明な点がございましたら、お気軽にお問い合わせください。
      </p>
    </div>
  `
}
