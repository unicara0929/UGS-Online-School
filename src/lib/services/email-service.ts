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
      from: `"UGSオンラインスクール" <${process.env.SMTP_USER}>`,
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
  const fpOnboardingLink = `${appUrl}/dashboard/fp-onboarding?from=email`

  const subject = '【UGSオンラインスクール】FPエイド昇格のお知らせとご案内'

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

    <p style="margin-bottom: 15px;">UGSオンラインスクール事務局です。</p>

    <p style="margin-bottom: 15px;">
      このたびは、UGSオンラインスクールにおける<br>
      <strong style="color: #1e40af;">「FPエイド」への昇格が承認されました</strong>のでお知らせいたします。<br>
      おめでとうございます！
    </p>

    <div style="border-top: 2px solid #cbd5e1; margin: 30px 0;"></div>

    <h2 style="color: #1e40af; font-size: 18px; margin-bottom: 15px;">■ 今後の流れについて</h2>

    <p style="margin-bottom: 15px;">
      FPエイドとして活動をスタートしていただく前に、<br>
      まずは<strong>「FPエイド向けガイダンス動画」の視聴</strong>をお願いしています。
    </p>

    <p style="margin-bottom: 15px;">ガイダンス動画では、以下のような内容を解説しています。</p>

    <ul style="margin-bottom: 15px; padding-left: 20px;">
      <li>FPエイドの役割とスタンス</li>
      <li>UGSオンラインスクール内での具体的な動き方</li>
      <li>紹介・契約・報酬に関する基本ルール</li>
      <li>注意事項や禁止事項 など</li>
    </ul>

    <p style="margin-bottom: 15px;">
      動画を最後まで（90％以上）視聴いただくと、<br>
      通常のFPエイド向け機能（紹介管理・契約管理など）が利用できるようになります。
    </p>

    <div style="border-top: 2px solid #cbd5e1; margin: 30px 0;"></div>

    <h2 style="color: #1e40af; font-size: 18px; margin-bottom: 15px;">■ ガイダンス動画の視聴方法</h2>

    <ol style="margin-bottom: 15px; padding-left: 20px;">
      <li>下記のボタン、またはURLからUGSにアクセス</li>
      <li>ログイン（※登録メールアドレス：${userEmail}）</li>
      <li>ログイン後、自動的に「FPエイド向けガイダンス動画」のページが表示されます</li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${fpOnboardingLink}" style="display: inline-block; background-color: #1e40af; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        FPエイドガイダンス動画を開く
      </a>
    </div>

    <p style="margin-bottom: 15px; font-size: 14px; color: #64748b;">
      ※ログインしていない場合は、先にログイン画面が表示されます。<br>
      　ログイン完了後、自動的にガイダンス動画ページへ遷移します。
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
      今後のご活躍を、UGSオンラインスクール一同楽しみにしております。
    </p>

    <div style="border-top: 1px solid #cbd5e1; margin-top: 40px; padding-top: 20px; text-align: center; font-size: 14px; color: #64748b;">
      <p style="margin: 0;">UGSオンラインスクール事務局</p>
    </div>
  </div>
</body>
</html>
  `

  const text = `
${userName} 様

UGSオンラインスクール事務局です。

このたびは、UGSオンラインスクールにおける
「FPエイド」への昇格が承認されましたのでお知らせいたします。
おめでとうございます！

────────────────────
■ 今後の流れについて
────────────────────
FPエイドとして活動をスタートしていただく前に、
まずは「FPエイド向けガイダンス動画」の視聴をお願いしています。

ガイダンス動画では、以下のような内容を解説しています。
・FPエイドの役割とスタンス
・UGSオンラインスクール内での具体的な動き方
・紹介・契約・報酬に関する基本ルール
・注意事項や禁止事項 など

動画を最後まで（90％以上）視聴いただくと、
通常のFPエイド向け機能（紹介管理・契約管理など）が利用できるようになります。

────────────────────
■ ガイダンス動画の視聴方法
────────────────────
1. 下記のボタン、またはURLからUGSにアクセス
2. ログイン（※登録メールアドレス：${userEmail}）
3. ログイン後、自動的に「FPエイド向けガイダンス動画」のページが表示されます

【FPエイドガイダンス動画を開く】
${fpOnboardingLink}

※ログインしていない場合は、先にログイン画面が表示されます。
　ログイン完了後、自動的にガイダンス動画ページへ遷移します。

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

今後のご活躍を、UGSオンラインスクール一同楽しみにしております。

--------------------------------
UGSオンラインスクール事務局
--------------------------------
  `

  const transporter = createTransporter()

  try {
    const info = await transporter.sendMail({
      from: `"UGSオンラインスクール事務局" <${process.env.SMTP_USER}>`,
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
