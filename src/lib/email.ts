import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
})

export interface PaymentConfirmationEmailData {
  to: string
  userName: string
  amount: number
  subscriptionId: string
  loginUrl: string
}

export interface PaymentFailedEmailData {
  to: string
  userName: string
  amount: number
  invoiceId: string
  updateCardUrl: string
}

export interface SubscriptionCancelledEmailData {
  to: string
  userName: string
  subscriptionId: string
  reactivateUrl: string
}

export async function sendPaymentConfirmationEmail(data: PaymentConfirmationEmailData) {
  const mailOptions = {
    from: `"UGSオンラインスクール" <${process.env.SMTP_USER}>`,
    to: data.to,
    subject: 'UGSオンラインスクール - 決済完了のお知らせ',
    encoding: 'utf-8',
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

/**
 * 決済失敗メールを送信
 */
export async function sendPaymentFailedEmail(data: PaymentFailedEmailData) {
  const mailOptions = {
    from: `"UGSオンラインスクール" <${process.env.SMTP_USER}>`,
    to: data.to,
    subject: 'UGSオンラインスクール - 決済失敗のお知らせ',
    encoding: 'utf-8',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>決済失敗のお知らせ</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
          .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>UGSオンラインスクール</h1>
            <p>決済失敗のお知らせ</p>
          </div>
          
          <div class="content">
            <h2>${data.userName} 様</h2>
            
            <div class="warning">
              <h3>⚠️ 決済が失敗しました</h3>
              <p>お支払いの処理に失敗しました。カード情報の確認をお願いいたします。</p>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3>決済情報</h3>
              <p><strong>請求金額:</strong> ¥${data.amount.toLocaleString()}</p>
              <p><strong>請求書ID:</strong> ${data.invoiceId}</p>
              <p><strong>失敗日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
            </div>
            
            <h3>次のステップ</h3>
            <p>以下のいずれかの方法で決済を完了してください：</p>
            <ol>
              <li>カード情報を更新して再決済を行う</li>
              <li>別のカードで決済を行う</li>
              <li>カード会社に連絡して問題を確認する</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${data.updateCardUrl}" class="button">カード情報を更新する</a>
            </div>
            
            <p><strong>重要:</strong> 決済が完了しない場合、サービスへのアクセスが制限される可能性があります。</p>
            
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
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_PASS) {
      console.log('📧 [DEV MODE] Payment failed email would be sent to:', data.to)
      return
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Payment failed email sent successfully to:', data.to)
  } catch (error: any) {
    console.error('❌ Error sending payment failed email:', error)
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Email sending failed, but continuing in development mode')
      return
    }
    throw error
  }
}

/**
 * サブスクリプションキャンセルメールを送信
 */
export async function sendSubscriptionCancelledEmail(data: SubscriptionCancelledEmailData) {
  const mailOptions = {
    from: `"UGSオンラインスクール" <${process.env.SMTP_USER}>`,
    to: data.to,
    subject: 'UGSオンラインスクール - サブスクリプションキャンセルのお知らせ',
    encoding: 'utf-8',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>サブスクリプションキャンセルのお知らせ</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #64748b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .button { display: inline-block; background: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
          .info { background: #f1f5f9; border-left: 4px solid #64748b; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>UGSオンラインスクール</h1>
            <p>サブスクリプションキャンセルのお知らせ</p>
          </div>
          
          <div class="content">
            <h2>${data.userName} 様</h2>
            
            <div class="info">
              <h3>サブスクリプションがキャンセルされました</h3>
              <p>ご利用いただき、ありがとうございました。</p>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3>キャンセル情報</h3>
              <p><strong>サブスクリプションID:</strong> ${data.subscriptionId}</p>
              <p><strong>キャンセル日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
            </div>
            
            <p>現在の期間が終了するまで、サービスをご利用いただけます。</p>
            
            <h3>再開をご希望の場合</h3>
            <p>いつでもサブスクリプションを再開することができます。</p>
            
            <div style="text-align: center;">
              <a href="${data.reactivateUrl}" class="button">サブスクリプションを再開する</a>
            </div>
            
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
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_PASS) {
      console.log('📧 [DEV MODE] Subscription cancelled email would be sent to:', data.to)
      return
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Subscription cancelled email sent successfully to:', data.to)
  } catch (error: any) {
    console.error('❌ Error sending subscription cancelled email:', error)
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Email sending failed, but continuing in development mode')
      return
    }
    throw error
  }
}

// お問い合わせ関連のメール

export interface ContactConfirmationEmailData {
  to: string
  userName: string
  type: string
  subject: string | null
  message: string
  submissionId: string
}

export interface ContactNotificationToAdminData {
  userName: string
  userEmail: string
  userRole: string
  type: string
  subject: string | null
  message: string
  submissionId: string
}

const CONTACT_TYPE_LABELS: Record<string, string> = {
  ACCOUNT: 'アカウントについて',
  PAYMENT: '支払い・請求について',
  CONTENT: 'コンテンツについて',
  TECHNICAL: '技術的な問題',
  OTHER: 'その他',
}

// ユーザーへの自動返信メール
export async function sendContactConfirmationEmail(data: ContactConfirmationEmailData) {
  const mailOptions = {
    from: `"UGSオンラインスクール" <${process.env.SMTP_USER}>`,
    to: data.to,
    subject: 'UGSオンラインスクール - お問い合わせ受付完了',
    encoding: 'utf-8',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>お問い合わせ受付完了</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e293b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .info-box { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1e293b; }
          .footer { padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>UGSオンラインスクール</h1>
            <p>お問い合わせ受付完了</p>
          </div>

          <div class="content">
            <h2>${data.userName} 様</h2>
            <p>お問い合わせいただき、ありがとうございます。</p>
            <p>以下の内容でお問い合わせを受け付けました。担当者より2営業日以内にご連絡いたします。</p>

            <div class="info-box">
              <p><strong>お問い合わせID:</strong> ${data.submissionId}</p>
              <p><strong>種別:</strong> ${CONTACT_TYPE_LABELS[data.type] || data.type}</p>
              ${data.subject ? `<p><strong>件名:</strong> ${data.subject}</p>` : ''}
              <p><strong>受付日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>お問い合わせ内容:</strong></p>
              <p style="white-space: pre-wrap;">${data.message}</p>
            </div>

            <p>ご不明な点がございましたら、このメールに返信いただくか、サポートページよりお問い合わせください。</p>
          </div>

          <div class="footer">
            <p>UGSオンラインスクール</p>
            <p>※ このメールは自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_PASS) {
      console.log('📧 [DEV MODE] Contact confirmation email would be sent to:', data.to)
      return
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Contact confirmation email sent successfully to:', data.to)
  } catch (error: any) {
    console.error('❌ Error sending contact confirmation email:', error)
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Email sending failed, but continuing in development mode')
      return
    }
    throw error
  }
}

// 管理者への通知メール
export async function sendContactNotificationToAdmin(data: ContactNotificationToAdminData) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER

  const mailOptions = {
    from: `"UGSオンラインスクール" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `【お問い合わせ】${CONTACT_TYPE_LABELS[data.type] || data.type} - ${data.userName}様`,
    encoding: 'utf-8',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>新規お問い合わせ通知</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .info-box { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>新規お問い合わせ</h1>
          </div>

          <div class="content">
            <p>会員からお問い合わせがありました。</p>

            <div class="info-box">
              <h3>送信者情報</h3>
              <p><strong>お名前:</strong> ${data.userName}</p>
              <p><strong>メールアドレス:</strong> ${data.userEmail}</p>
              <p><strong>ロール:</strong> ${data.userRole}</p>
            </div>

            <div class="info-box">
              <h3>お問い合わせ内容</h3>
              <p><strong>お問い合わせID:</strong> ${data.submissionId}</p>
              <p><strong>種別:</strong> ${CONTACT_TYPE_LABELS[data.type] || data.type}</p>
              ${data.subject ? `<p><strong>件名:</strong> ${data.subject}</p>` : ''}
              <p><strong>受付日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
            </div>

            <div class="info-box">
              <h3>本文</h3>
              <p style="white-space: pre-wrap;">${data.message}</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}/dashboard/admin/contacts/${data.submissionId}" class="button">
                管理画面で確認する
              </a>
            </div>
          </div>

          <div class="footer">
            <p>UGSオンラインスクール 管理者通知</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_PASS) {
      console.log('📧 [DEV MODE] Contact notification email would be sent to admin:', adminEmail)
      return
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Contact notification email sent successfully to admin:', adminEmail)
  } catch (error: any) {
    console.error('❌ Error sending contact notification email to admin:', error)
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Email sending failed, but continuing in development mode')
      return
    }
    throw error
  }
}

// =====================
// 名刺注文関連のメール
// =====================

export interface BusinessCardOrderConfirmationEmailData {
  to: string
  userName: string
  orderId: string
  displayName: string
  displayNameKana: string
  phoneNumber: string
  email: string
  postalCode: string
  prefecture: string
  city: string
  addressLine1: string
  addressLine2?: string | null
  designName: string
  quantity: number
}

export interface BusinessCardOrderNotificationToAdminData {
  userName: string
  userEmail: string
  userRole: string
  orderId: string
  displayName: string
  designName: string
  quantity: number
}

// ユーザーへの名刺注文確認メール
export async function sendBusinessCardOrderConfirmationEmail(data: BusinessCardOrderConfirmationEmailData) {
  const mailOptions = {
    from: `"UGSオンラインスクール" <${process.env.SMTP_USER}>`,
    to: data.to,
    subject: 'UGSオンラインスクール - 名刺注文受付完了',
    encoding: 'utf-8',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>名刺注文受付完了</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e293b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .info-box { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1e293b; }
          .footer { padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
          .detail-row { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>UGSオンラインスクール</h1>
            <p>名刺注文受付完了</p>
          </div>

          <div class="content">
            <h2>${data.userName} 様</h2>
            <p>名刺のご注文をいただき、ありがとうございます。</p>
            <p>以下の内容で注文を受け付けました。発注処理が完了次第、ご連絡いたします。</p>

            <div class="info-box">
              <p><strong>注文番号:</strong> ${data.orderId}</p>
              <p><strong>受付日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3>名刺に印字する情報</h3>
              <div class="detail-row">
                <div class="detail-label">表示名</div>
                <div class="detail-value">${data.displayName}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">フリガナ</div>
                <div class="detail-value">${data.displayNameKana}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">電話番号</div>
                <div class="detail-value">${data.phoneNumber}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">メールアドレス</div>
                <div class="detail-value">${data.email}</div>
              </div>
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3>郵送先住所</h3>
              <p>
                〒${data.postalCode}<br />
                ${data.prefecture}${data.city}${data.addressLine1}
                ${data.addressLine2 ? `<br />${data.addressLine2}` : ''}
              </p>
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3>注文詳細</h3>
              <div class="detail-row">
                <div class="detail-label">名刺デザイン</div>
                <div class="detail-value">${data.designName}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">部数</div>
                <div class="detail-value">${data.quantity}枚</div>
              </div>
            </div>

            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
          </div>

          <div class="footer">
            <p>UGSオンラインスクール</p>
            <p>※ このメールは自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_PASS) {
      console.log('📧 [DEV MODE] Business card order confirmation email would be sent to:', data.to)
      return
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Business card order confirmation email sent successfully to:', data.to)
  } catch (error: any) {
    console.error('❌ Error sending business card order confirmation email:', error)
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Email sending failed, but continuing in development mode')
      return
    }
    throw error
  }
}

// 管理者への名刺注文通知メール
export async function sendBusinessCardOrderNotificationToAdmin(data: BusinessCardOrderNotificationToAdminData) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER

  const mailOptions = {
    from: `"UGSオンラインスクール" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `【名刺注文】${data.userName}様から注文がありました`,
    encoding: 'utf-8',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>新規名刺注文通知</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .info-box { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>新規名刺注文</h1>
          </div>

          <div class="content">
            <p>会員から名刺注文がありました。</p>

            <div class="info-box">
              <h3>注文者情報</h3>
              <p><strong>お名前:</strong> ${data.userName}</p>
              <p><strong>メールアドレス:</strong> ${data.userEmail}</p>
              <p><strong>ロール:</strong> ${data.userRole}</p>
            </div>

            <div class="info-box">
              <h3>注文内容</h3>
              <p><strong>注文番号:</strong> ${data.orderId}</p>
              <p><strong>表示名:</strong> ${data.displayName}</p>
              <p><strong>デザイン:</strong> ${data.designName}</p>
              <p><strong>部数:</strong> ${data.quantity}枚</p>
              <p><strong>受付日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}/dashboard/admin/business-card" class="button">
                管理画面で確認する
              </a>
            </div>
          </div>

          <div class="footer">
            <p>UGSオンラインスクール 管理者通知</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_PASS) {
      console.log('📧 [DEV MODE] Business card order notification email would be sent to admin:', adminEmail)
      return
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Business card order notification email sent successfully to admin:', adminEmail)
  } catch (error: any) {
    console.error('❌ Error sending business card order notification email to admin:', error)
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Email sending failed, but continuing in development mode')
      return
    }
    throw error
  }
}
