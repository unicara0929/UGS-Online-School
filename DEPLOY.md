# 本番環境デプロイ手順

## 📋 前提条件

1. GitHubリポジトリにコードがプッシュされていること
2. Supabaseプロジェクトが作成されていること
3. Stripeアカウントが作成されていること
4. 環境変数が準備されていること

## 🚀 Vercelでのデプロイ（推奨）

### Step 1: Vercelアカウント作成

1. [Vercel](https://vercel.com)にアクセス
2. 「Sign Up」→ GitHubアカウントでログイン
3. GitHubアカウントを認証

### Step 2: プロジェクトをインポート

1. Vercelダッシュボードで「Add New」→「Project」
2. GitHubリポジトリ `unicara0929/UGS-Online-School` を選択
3. 「Import」をクリック

### Step 3: ビルド設定

- **Framework Preset**: Next.js（自動検出）
- **Root Directory**: `./`（そのまま）
- **Build Command**: `prisma generate && next build`（自動設定される）
- **Output Directory**: `.next`（自動）
- **Install Command**: `npm install`（自動）

### Step 4: 環境変数の設定

Vercelダッシュボードの「Settings」→「Environment Variables」で以下を設定：

#### 必須環境変数

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Database (Supabase)
DATABASE_URL=your_supabase_connection_string
DIRECT_URL=your_supabase_direct_connection_string

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Step 5: Prismaマイグレーション

本番環境のデータベースを初期化：

1. **方法A: Vercelのビルドログで確認**
   - 初回デプロイ時にPrismaが自動生成される

2. **方法B: ローカルからマイグレーション実行**
   ```bash
   # .env.localに本番環境のDATABASE_URLを設定
   npx prisma migrate deploy
   ```

3. **方法C: Supabase Dashboardから直接実行**
   - Supabase Dashboard → SQL Editor
   - Prismaが生成したSQLを実行

### Step 6: Stripe Webhook設定

1. Stripe Dashboard → Developers → Webhooks
2. 「Add endpoint」をクリック
3. Endpoint URL: `https://your-domain.vercel.app/api/webhooks/stripe`
4. イベントを選択：
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
5. Webhook secretをコピーしてVercelの環境変数に設定

### Step 7: デプロイ実行

1. Vercelダッシュボードで「Deploy」をクリック
2. ビルドが完了するまで待機（3-5分）
3. デプロイが完了するとURLが発行される（例：`https://ugs-online-school.vercel.app`）

### Step 8: カスタムドメイン設定（任意）

1. Vercelダッシュボード → Settings → Domains
2. ドメインを追加（例：`ugs-onlineschool.com`）
3. DNS設定を指示に従って実施

## 🔧 トラブルシューティング

### ビルドエラー

- **Prismaエラー**: `DATABASE_URL`が正しく設定されているか確認
- **型エラー**: `npm run build`でローカル確認
- **環境変数エラー**: 全ての必須環境変数が設定されているか確認

### 実行時エラー

- **Supabase接続エラー**: URLとキーが正しいか確認
- **Stripeエラー**: 本番環境のキーを使用しているか確認（test mode vs live mode）
- **データベースエラー**: Prismaマイグレーションが完了しているか確認

### パフォーマンス

- Vercelは自動的に最適化される
- 画像は`/public`配下に配置し、`next/image`を使用
- API RoutesはServerless Functionsとして実行される

## 📝 本番環境チェックリスト

- [ ] 環境変数が全て設定されている
- [ ] Prismaマイグレーションが実行されている
- [ ] Stripe Webhookが設定されている
- [ ] メール送信機能がテスト済み
- [ ] 認証フローがテスト済み
- [ ] 決済フローがテスト済み
- [ ] カスタムドメインが設定されている（任意）
- [ ] SSL証明書が自動設定されている（Vercelで自動）

## 🔐 セキュリティチェック

- [ ] 環境変数がGitHubにコミットされていない
- [ ] `.env.local`が`.gitignore`に含まれている
- [ ] Supabase RLS（Row Level Security）が設定されている
- [ ] API Routesで認証チェックが実装されている
- [ ] 本番環境のStripeキーを使用している

## 📊 モニタリング

- Vercel Dashboardでアクセスログを確認
- Supabase Dashboardでデータベース使用量を確認
- Stripe Dashboardで決済状況を確認

## 🔄 継続的デプロイ（CI/CD）

Vercelは自動的にGitHubのmainブランチにプッシュされるたびにデプロイされます。

- **mainブランチ**: 本番環境に自動デプロイ
- **その他のブランチ**: プレビュー環境が自動作成

## 💡 次のステップ

1. **アナリティクス設定**: Google AnalyticsやVercel Analyticsを追加
2. **エラー監視**: Sentryなどのエラー監視ツールを追加
3. **パフォーマンス最適化**: Lighthouseスコアを確認
4. **SEO最適化**: メタタグやsitemapを設定

