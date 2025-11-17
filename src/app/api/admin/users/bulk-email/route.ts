import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'
import { stripe } from '@/lib/stripe'

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

// ユーザーの決済リンクを作成
async function createPaymentLink(email: string, name: string): Promise<string | null> {
  try {
    console.log(`  🔄 createPaymentLink開始: ${email}, ${name}`)
    const targetAmount = 5500 // ¥5,500

    // ¥5,500の価格を検索
    const allPrices = await stripe.prices.list({
      limit: 100,
      active: true,
    })

    const targetPrice = allPrices.data.find(p =>
      p.unit_amount === targetAmount &&
      p.currency === 'jpy' &&
      p.active === true &&
      p.recurring?.interval === 'month'
    )

    let priceId: string

    if (targetPrice) {
      priceId = targetPrice.id
      console.log(`  ✅ 既存の価格を使用: ${priceId}`)
    } else {
      // 価格が見つからない場合は新規作成
      console.log(`  ⚠️ 価格が見つからないため新規作成中...`)
      const product = await stripe.products.create({
        name: 'UGSオンラインスクール 月額プラン',
        description: '学び → 実践 → 自立を一体化したFP育成プラットフォーム',
      })

      const price = await stripe.prices.create({
        unit_amount: targetAmount,
        currency: 'jpy',
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
        product: product.id,
      })
      priceId = price.id
      console.log(`  ✅ 新規価格作成: ${priceId}`)
    }

    // Checkout Sessionを作成
    console.log(`  🔄 Checkout Session作成中...`)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: email,
      metadata: {
        userName: name,
        userEmail: email,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`,
      subscription_data: {
        metadata: {
          userName: name,
          userEmail: email,
        },
      },
    })

    console.log(`  ✅ Session作成成功: ${session.id}`)
    console.log(`  🔗 元のURL: ${session.url}`)

    // 短縮URLを生成
    const shortUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${session.id}`
    console.log(`  ✂️ 短縮URL: ${shortUrl}`)

    return shortUrl
  } catch (error) {
    console.error(`  ❌ 決済リンク作成エラー (${email}):`, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
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
    let successCount = 0
    let failedCount = 0

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
            failedCount++
            continue
          }
        }

        await transporter.sendMail({
          from: `"UGSオンラインスクール事務局" <${process.env.SMTP_USER}>`,
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

        successCount++
        console.log(`メール送信成功: ${user.email}`)
      } catch (error) {
        failedCount++
        console.error(`メール送信失敗: ${user.email}`, error)
      }
    }

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
