import nodemailer from 'nodemailer'

/**
 * メール送信サービス
 */

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
 * 汎用メール送信関数
 */
export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}) {
  const { to, subject, html } = params

  try {
    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"Unicara Growth Salon" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })

    console.log(`Email sent to: ${to}`)
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

/**
 * FPエイド昇格通知メールを送信
 */
export async function sendFPPromotionApprovedEmail(params: {
  to: string
  userName: string
  userEmail: string
}) {
  const { to, userName, userEmail } = params

  // 環境変数からアプリURLを取得
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const loginPageUrl = `${appUrl}/login`
  const dashboardLink = `${appUrl}/dashboard`

  const subject = '【Unicara Growth Salon】FPエイド昇格のお知らせとご案内'

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FPエイド昇格のお知らせ</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #1e40af; font-size: 24px; margin-bottom: 20px;">FPエイド昇格のお知らせ</h1>

    <p style="margin-bottom: 15px;">${userName} 様</p>

    <p style="margin-bottom: 15px;">Unicara Growth Salon事務局です。</p>

    <p style="margin-bottom: 15px;">
      このたびは、Unicara Growth Salonにおける<br>
      <strong style="color: #1e40af;">「FPエイド」への昇格が承認されました</strong>のでお知らせいたします。<br>
      おめでとうございます！
    </p>

    <div style="border-top: 2px solid #cbd5e1; margin: 30px 0;"></div>

    <h2 style="color: #1e40af; font-size: 18px; margin-bottom: 15px;">■ 今後の流れについて</h2>

    <p style="margin-bottom: 15px;">
      FPエイドとして活動をスタートしていただく前に、<br>
      以下の<strong>3つのステップ</strong>を完了していただく必要があります。
    </p>

    <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">【ステップ1】マネージャー連絡先の登録</p>
      <p style="margin: 0; font-size: 14px; color: #0c4a6e;">担当マネージャーからの連絡用に、電話番号・LINE IDを登録いただきます。</p>
    </div>

    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">【ステップ2】コンプライアンステスト</p>
      <p style="margin: 0; font-size: 14px; color: #78350f;">FPエイドとして活動するために必要な知識を確認するテストです。<br>合格ライン：90%以上</p>
    </div>

    <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #166534;">【ステップ3】ガイダンス動画の視聴</p>
      <p style="margin: 0; font-size: 14px; color: #14532d;">FPエイドの役割・ルール・注意事項などを解説した動画を視聴いただきます。<br>視聴完了条件：90%以上</p>
    </div>

    <p style="margin-bottom: 15px;">
      すべてのステップを完了すると、<br>
      通常のFPエイド向け機能（紹介管理・契約管理など）が利用できるようになります。
    </p>

    <div style="border-top: 2px solid #cbd5e1; margin: 30px 0;"></div>

    <h2 style="color: #1e40af; font-size: 18px; margin-bottom: 15px;">■ 開始方法</h2>

    <ol style="margin-bottom: 15px; padding-left: 20px;">
      <li>下記のボタン、またはURLからUGSにアクセス</li>
      <li>ログイン（※登録メールアドレス：${userEmail}）</li>
      <li>ログイン後、自動的に最初のステップが表示されます</li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardLink}" style="display: inline-block; background-color: #1e40af; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        FPエイドオンボーディングを開始
      </a>
    </div>

    <p style="margin-bottom: 15px; font-size: 14px; color: #64748b;">
      ※ログインしていない場合は、先にログイン画面が表示されます。<br>
      　ログイン完了後、自動的にオンボーディングページへ遷移します。
    </p>

    <div style="border-top: 2px solid #cbd5e1; margin: 30px 0;"></div>

    <h2 style="color: #1e40af; font-size: 18px; margin-bottom: 15px;">■ ログイン情報の確認</h2>

    <p style="margin-bottom: 10px;"><strong>ログインページURL：</strong></p>
    <p style="margin-bottom: 15px; padding-left: 10px;">
      <a href="${loginPageUrl}" style="color: #1e40af; text-decoration: none;">${loginPageUrl}</a>
    </p>

    <p style="margin-bottom: 10px;"><strong>登録メールアドレス：</strong></p>
    <p style="margin-bottom: 15px; padding-left: 10px;">${userEmail}</p>

    <p style="margin-bottom: 15px; font-size: 14px; color: #64748b;">
      パスワードをお忘れの場合は、<br>
      ログインページの「パスワードをお忘れの場合」より再設定をお願いいたします。
    </p>

    <div style="border-top: 2px solid #cbd5e1; margin: 30px 0;"></div>

    <p style="margin-bottom: 15px;">
      ご不明点やお困りごとがございましたら、<br>
      本メールへのご返信、もしくは事務局窓口までお気軽にご連絡ください。
    </p>

    <p style="margin-bottom: 15px;">
      今後のご活躍を、Unicara Growth Salon一同楽しみにしております。
    </p>

    <div style="border-top: 1px solid #cbd5e1; margin-top: 40px; padding-top: 20px; text-align: center; font-size: 14px; color: #64748b;">
      <p style="margin: 0;">Unicara Growth Salon事務局</p>
    </div>
  </div>
</body>
</html>
  `

  const text = `
${userName} 様

Unicara Growth Salon事務局です。

このたびは、Unicara Growth Salonにおける
「FPエイド」への昇格が承認されましたのでお知らせいたします。
おめでとうございます！

────────────────────
■ 今後の流れについて
────────────────────
FPエイドとして活動をスタートしていただく前に、
以下の3つのステップを完了していただく必要があります。

【STEP 1】マネージャー連絡先の登録
担当マネージャーの電話番号とLINE IDを登録してください。

【STEP 2】コンプライアンステストの受験
FPエイドとして活動するために必要なコンプライアンス知識を
テストで確認します。合格するまで次のステップに進めません。

【STEP 3】ガイダンス動画の視聴
FPエイドの役割、活動の進め方、報酬ルールなどを解説した
ガイダンス動画を最後まで（90％以上）視聴してください。

すべてのステップを完了すると、
通常のFPエイド向け機能（紹介管理・契約管理など）が
利用できるようになります。

────────────────────
■ オンボーディングの開始方法
────────────────────
1. 下記URLからUGSにアクセス
2. ログイン（※登録メールアドレス：${userEmail}）
3. ログイン後、自動的にオンボーディング画面が表示されます

【UGSにログインする】
${dashboardLink}

※ログインしていない場合は、先にログイン画面が表示されます。

────────────────────
■ ログイン情報の確認
────────────────────
・ログインページURL：
　${loginPageUrl}

・登録メールアドレス：
　${userEmail}

パスワードをお忘れの場合は、
ログインページの「パスワードをお忘れの場合」より再設定をお願いいたします。

────────────────────
ご不明点やお困りごとがございましたら、
本メールへのご返信、もしくは事務局窓口までお気軽にご連絡ください。

今後のご活躍を、Unicara Growth Salon一同楽しみにしております。

--------------------------------
Unicara Growth Salon事務局
--------------------------------
  `

  const transporter = createTransporter()

  try {
    const info = await transporter.sendMail({
      from: `"Unicara Growth Salon事務局" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      encoding: 'utf-8',
    })

    console.log('FP promotion email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Failed to send FP promotion email:', error)
    throw error
  }
}

/**
 * メールアドレス確認メールを送信
 */
export async function sendEmailVerification(params: {
  to: string
  userName: string
  verificationLink: string
}) {
  const { to, userName, verificationLink } = params

  const subject = '【Unicara Growth Salon】メールアドレスの確認'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Unicara Growth Salon</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">メールアドレスの確認</h2>

        <p>こんにちは、<strong>${userName}</strong>様</p>

        <p>Unicara Growth Salonへのご登録ありがとうございます。</p>

        <p>登録を完了するには、以下のボタンをクリックしてメールアドレスを確認してください：</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            メールアドレスを確認する
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          ボタンが機能しない場合は、以下のリンクをコピーしてブラウザに貼り付けてください：<br>
          <a href="${verificationLink}" style="color: #667eea; word-break: break-all;">${verificationLink}</a>
        </p>

        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ 重要：</strong> このリンクは24時間有効です。期限が切れた場合は、再度登録してください。
          </p>
        </div>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          このメールに心当たりがない場合は、無視していただいて構いません。
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          © 2025 Unicara Growth Salon. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
Unicara Growth Salon - メールアドレスの確認

こんにちは、${userName}様

Unicara Growth Salonへのご登録ありがとうございます。

登録を完了するには、以下のリンクをクリックしてメールアドレスを確認してください：

${verificationLink}

⚠️ このリンクは24時間有効です。期限が切れた場合は、再度登録してください。

このメールに心当たりがない場合は、無視していただいて構いません。

---
© 2025 Unicara Growth Salon. All rights reserved.
  `

  try {
    const transporter = createTransporter()

    const info = await transporter.sendMail({
      from: `"Unicara Growth Salon" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      encoding: 'utf-8',
    })

    console.log('Verification email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Failed to send verification email:', error)
    throw error
  }
}

/**
 * イベント参加確認メールを送信
 */
export async function sendEventConfirmationEmail(params: {
  to: string
  userName: string
  eventTitle: string
  eventDate: string
  eventTime?: string
  eventLocation?: string
  venueType: string
  eventId: string
}) {
  const { to, userName, eventTitle, eventDate, eventTime, eventLocation, venueType, eventId } = params

  const subject = `【Unicara Growth Salon】イベント参加確定：${eventTitle}`

  const venueTypeText = venueType === 'ONLINE' ? 'オンライン開催' :
                        venueType === 'OFFLINE' ? 'オフライン開催' : 'ハイブリッド開催'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Unicara Growth Salon</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">イベント参加が確定しました</h2>

        <p>こんにちは、<strong>${userName}</strong>様</p>

        <p>以下のイベントへの参加が確定しました。</p>

        <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #667eea;">${eventTitle}</h3>
          <div style="margin: 10px 0;">
            <strong>📅 日時:</strong> ${eventDate}${eventTime ? ` ${eventTime}` : ''}
          </div>
          <div style="margin: 10px 0;">
            <strong>📍 開催形式:</strong> ${venueTypeText}
          </div>
          ${eventLocation ? `
          <div style="margin: 10px 0;">
            <strong>🏢 場所:</strong> ${eventLocation}
          </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/events"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            イベント詳細を確認
          </a>
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ キャンセルについて:</strong><br>
            イベントをキャンセルする場合は、マイページのイベント一覧からキャンセル手続きを行ってください。
          </p>
        </div>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          ご参加をお待ちしております！
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          © 2025 Unicara Growth Salon. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
Unicara Growth Salon - イベント参加確定

こんにちは、${userName}様

以下のイベントへの参加が確定しました。

【イベント情報】
タイトル: ${eventTitle}
日時: ${eventDate}${eventTime ? ` ${eventTime}` : ''}
開催形式: ${venueTypeText}
${eventLocation ? `場所: ${eventLocation}` : ''}

イベント詳細: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/events

⚠️ キャンセルについて:
イベントをキャンセルする場合は、マイページのイベント一覧からキャンセル手続きを行ってください。

ご参加をお待ちしております！

---
© 2025 Unicara Growth Salon. All rights reserved.
  `

  try {
    const transporter = createTransporter()

    const info = await transporter.sendMail({
      from: `"Unicara Growth Salon" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      encoding: 'utf-8',
    })

    console.log('Event confirmation email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Failed to send event confirmation email:', error)
    throw error
  }
}
