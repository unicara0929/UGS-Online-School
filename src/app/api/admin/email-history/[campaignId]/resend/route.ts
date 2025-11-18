import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import nodemailer from 'nodemailer'
import {
  createEmailCampaign,
  type EmailRecipient,
} from '@/lib/services/email-history-service'
import { createPaymentLink } from '@/lib/services/payment-link-service'

// SMTPトランスポーターの作成
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/**
 * メール再送API
 * POST /api/admin/email-history/[campaignId]/resend
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { campaignId } = await context.params
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: '再送対象のユーザーIDが必要です' },
        { status: 400 }
      )
    }

    // 元のキャンペーン情報を取得
    const originalCampaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        logs: {
          where: {
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
        },
      },
    })

    if (!originalCampaign) {
      return NextResponse.json(
        { error: 'メール送信履歴が見つかりません' },
        { status: 404 }
      )
    }

    if (originalCampaign.logs.length === 0) {
      return NextResponse.json(
        { error: '再送対象のユーザーが見つかりません' },
        { status: 404 }
      )
    }

    const transporter = createTransporter()
    const recipients: EmailRecipient[] = []

    // 決済リンクが必要かチェック
    const needsPaymentLink = originalCampaign.body.includes('{{payment_link}}')
    console.log('📧 メール再送開始')
    console.log('💳 決済リンクが必要:', needsPaymentLink)

    // 各ユーザーにメールを再送
    for (const log of originalCampaign.logs) {
      try {
        console.log(`\n--- ${log.user.email} へのメール再送開始 ---`)

        // 本文中の {{name}} を実際の名前に置換
        let personalizedBody = originalCampaign.body.replace(
          /{{name}}/g,
          log.user.name
        )

        // 決済リンクが必要な場合、ユーザーごとに新規生成
        if (needsPaymentLink) {
          console.log('💳 決済リンク生成中...')
          const paymentLink = await createPaymentLink(log.user.email, log.user.name)

          if (paymentLink) {
            console.log(`✅ 決済リンク: ${paymentLink}`)
            personalizedBody = personalizedBody.replace(/{{payment_link}}/g, paymentLink)
            console.log(`📝 置換後の本文: ${personalizedBody.substring(0, 200)}...`)
          } else {
            // 決済リンク作成失敗時は、そのユーザーへの送信をスキップ
            console.error(`❌ 決済リンク作成失敗: ${log.user.email}`)
            recipients.push({
              userId: log.user.id,
              email: log.user.email,
              status: 'FAILED',
              errorMessage: '決済リンクの作成に失敗しました',
            })
            continue
          }
        }

        await transporter.sendMail({
          from: `"UGSオンラインスクール事務局" <${process.env.SMTP_USER}>`,
          to: log.user.email,
          subject: originalCampaign.subject,
          text: personalizedBody,
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333;">
  ${personalizedBody.replace(/\n/g, '<br>')}
</body>
</html>`,
          encoding: 'utf-8',
        })

        recipients.push({
          userId: log.user.id,
          email: log.user.email,
          status: 'SENT',
        })
        console.log(`✅ メール送信成功: ${log.user.email}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '送信失敗'
        recipients.push({
          userId: log.user.id,
          email: log.user.email,
          status: 'FAILED',
          errorMessage,
        })
      }
    }

    // 再送履歴を新規キャンペーンとして記録
    await createEmailCampaign(
      {
        subject: `[再送] ${originalCampaign.subject}`,
        body: originalCampaign.body,
        templateType: originalCampaign.templateType || undefined,
        sourceType: originalCampaign.sourceType,
        eventId: originalCampaign.eventId || undefined,
        totalCount: recipients.length,
        sentBy: authUser!.id,
      },
      recipients
    )

    const successCount = recipients.filter((r) => r.status === 'SENT').length
    const failedCount = recipients.filter((r) => r.status !== 'SENT').length

    return NextResponse.json({
      success: true,
      message: `${successCount}件のメールを再送しました${failedCount > 0 ? `（${failedCount}件失敗）` : ''}`,
      successCount,
      failedCount,
      total: recipients.length,
    })
  } catch (error) {
    console.error('Resend email error:', error)
    return NextResponse.json(
      { error: 'メール再送に失敗しました' },
      { status: 500 }
    )
  }
}
