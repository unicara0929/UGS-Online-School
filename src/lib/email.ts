import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export interface PaymentConfirmationEmailData {
  to: string
  userName: string
  amount: number
  subscriptionId: string
  loginUrl: string
}

export async function sendPaymentConfirmationEmail(data: PaymentConfirmationEmailData) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: data.to,
    subject: 'UGSオンラインスクール - 決済完了のお知らせ',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>決済完了のお知らせ</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e293b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .button { display: inline-block; background: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>UGSオンラインスクール</h1>
            <p>決済完了のお知らせ</p>
          </div>
          
          <div class="content">
            <h2>${data.userName} 様</h2>
            <p>この度は、UGSオンラインスクールにお申し込みいただき、誠にありがとうございます。</p>
            
            <p>決済が正常に完了いたしました。以下の内容でご確認ください。</p>
            
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3>決済情報</h3>
              <p><strong>お支払い金額:</strong> ¥${data.amount.toLocaleString()}</p>
              <p><strong>サブスクリプションID:</strong> ${data.subscriptionId}</p>
              <p><strong>決済日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
            </div>
            
            <p>これで、UGSオンラインスクールの全機能をご利用いただけます。</p>
            
            <div style="text-align: center;">
              <a href="${data.loginUrl}" class="button">ログインして学習を開始する</a>
            </div>
            
            <h3>利用可能な機能</h3>
            <ul>
              <li>3カテゴリ × 2レベル = 6コンテンツ群へのアクセス</li>
              <li>FPエイド昇格システム</li>
              <li>報酬管理機能</li>
              <li>イベント参加権限</li>
              <li>LP面談サポート</li>
              <li>チーム管理機能（昇格後）</li>
            </ul>
            
            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
          </div>
          
          <div class="footer">
            <p>UGSオンラインスクール</p>
            <p>学び → 実践 → 自立を一体化したFP育成プラットフォーム</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    // 開発モードでメール送信をスキップする場合
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_PASS) {
      console.log('📧 [DEV MODE] Email would be sent to:', data.to)
      console.log('📧 Subject:', mailOptions.subject)
      console.log('📧 Message preview:', mailOptions.html.substring(0, 200) + '...')
      return // メール送信をスキップ
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Payment confirmation email sent successfully to:', data.to)
  } catch (error: any) {
    console.error('❌ Error sending payment confirmation email:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    })
    
    // 開発モードではエラーを無視して続行
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Email sending failed, but continuing in development mode')
      return
    }
    
    throw error
  }
}
