import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
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

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { userIds, subject, body } = await request.json()

    // バリデーション
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: '送信先ユーザーが指定されていません' },
        { status: 400 }
      )
    }

    if (!subject || !body) {
      return NextResponse.json(
        { error: '件名と本文を入力してください' },
        { status: 400 }
      )
    }

    // ユーザー情報を取得
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
      }
    })

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりませんでした' },
        { status: 404 }
      )
    }

    const transporter = createTransporter()
    const recipients: EmailRecipient[] = []

    // 決済リンクが必要かチェック
    const needsPaymentLink = body.includes('{{payment_link}}')
    console.log('📧 メール本文:', body)
    console.log('💳 決済リンクが必要:', needsPaymentLink)

    // 各ユーザーにメールを送信
    for (const user of users) {
      try {
        // 本文中の {{name}} を実際の名前に置換
        let personalizedBody = body.replace(/{{name}}/g, user.name)
        console.log(`\n--- ${user.email} へのメール送信開始 ---`)

        // 決済リンクが必要な場合、ユーザーごとに生成
        if (needsPaymentLink) {
          console.log('💳 決済リンク生成中...')
          const paymentLink = await createPaymentLink(user.email, user.name)

          if (paymentLink) {
            console.log(`✅ 決済リンク: ${paymentLink}`)
            personalizedBody = personalizedBody.replace(/{{payment_link}}/g, paymentLink)
            console.log(`📝 置換後の本文: ${personalizedBody.substring(0, 200)}...`)
          } else {
            // 決済リンク作成失敗時は、そのユーザーへの送信をスキップ
            console.error(`❌ 決済リンク作成失敗: ${user.email}`)
            recipients.push({
              userId: user.id,
              email: user.email,
              status: 'FAILED',
              errorMessage: '決済リンクの作成に失敗しました',
            })
            continue
          }
        }

        await transporter.sendMail({
          from: `"UGS事務局" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject,
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
          userId: user.id,
          email: user.email,
          status: 'SENT',
        })
        console.log(`メール送信成功: ${user.email}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '送信失敗'
        recipients.push({
          userId: user.id,
          email: user.email,
          status: 'FAILED',
          errorMessage,
        })
        console.error(`メール送信失敗: ${user.email}`, error)
      }
    }

    // メール送信履歴を記録
    await createEmailCampaign(
      {
        subject,
        body,
        sourceType: 'USER_MANAGEMENT',
        totalCount: users.length,
        sentBy: authUser!.id,
      },
      recipients
    )

    const successCount = recipients.filter((r) => r.status === 'SENT').length
    const failedCount = recipients.filter((r) => r.status !== 'SENT').length

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      total: users.length,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
