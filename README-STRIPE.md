# Stripe決済システム設定ガイド

## 1. Stripeアカウントの設定

1. [Stripe Dashboard](https://dashboard.stripe.com/)にアクセス
2. アカウントを作成またはログイン
3. テストモードでAPIキーを取得

## 2. Stripe商品・価格の設定

**商品ID**: `prod_THC6I1cybs89q3`

この商品IDを使用して、サブスクリプション価格を作成するか、既存の価格IDを使用してください。

## 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Stripe設定
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51YourPublishableKey
STRIPE_SECRET_KEY=sk_test_51YourSecretKey
STRIPE_WEBHOOK_SECRET=whsec_YourWebhookSecret

# メール設定（Gmail SMTP）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=suzuki@gouto.co.jp
SMTP_PASS=your-app-password

# アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. Stripe Webhookの設定

1. Stripe DashboardでWebhookエンドポイントを作成
2. エンドポイントURL: `https://yourdomain.com/api/webhooks/stripe`
3. イベントを選択:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`

## 5. Gmail SMTPの設定

1. Gmailアカウントで2段階認証を有効化
2. アプリパスワードを生成
3. 上記の環境変数に設定

## 6. 決済フロー

1. ユーザーが登録ページで情報入力
2. 決済ページにリダイレクト
3. Stripe Checkoutで決済処理
4. 決済完了後、確認メール送信
5. メール内のリンクからログイン

## 7. テスト方法

1. Stripeのテストカード番号を使用:
   - 成功: `4242 4242 4242 4242`
   - 失敗: `4000 0000 0000 0002`
2. 有効期限: 任意の未来の日付
3. CVC: 任意の3桁

## 8. 本番環境での注意点

- 本番用のStripe APIキーに変更
- HTTPSの使用を必須
- Webhookエンドポイントの本番URLに変更
- メール送信の本番設定
