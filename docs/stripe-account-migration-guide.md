# Stripeアカウント変更ガイド

## 📋 目次
1. [必要な作業の概要](#必要な作業の概要)
2. [ステップ1: 新しいStripe APIキーを取得](#ステップ1-新しいstripe-apiキーを取得)
3. [ステップ2: ProductとPriceの作成](#ステップ2-productとpriceの作成)
4. [ステップ3: Webhookの設定](#ステップ3-webhookの設定)
5. [ステップ4: 環境変数の更新](#ステップ4-環境変数の更新)
6. [ステップ5: 動作確認](#ステップ5-動作確認)

---

## 必要な作業の概要

Stripeアカウントを変更した場合、以下の作業が必要です:

- [x] 新しいStripe APIキーを取得
- [x] 新しいアカウントでProductとPriceを作成
- [x] Webhookエンドポイントを設定
- [x] 環境変数を更新
- [x] テストして動作確認

**所要時間**: 約30分

---

## ステップ1: 新しいStripe APIキーを取得

### 1.1 テストモードのAPIキーを取得

1. **新しいStripeアカウントにログイン**
   - https://dashboard.stripe.com/

2. **テストモードに切り替え**
   - 左上のトグルを「Test mode」に設定

3. **APIキーを取得**
   - 左メニューから `Developers` → `API keys` をクリック
   - 以下の2つのキーをコピー:
     - **Publishable key** (公開可能キー)
       - 例: `pk_test_xxxxxxxxxxxxx`
     - **Secret key** (秘密キー)
       - 「Reveal test key」をクリックしてコピー
       - 例: `sk_test_xxxxxxxxxxxxx`

### 1.2 本番モードのAPIキー（後で設定）

本番環境にデプロイする前に、本番モードでも同じ手順を実施してください。

---

## ステップ2: ProductとPriceの作成

新しいStripeアカウントでは、ProductとPriceを最初から作成する必要があります。

### 2.1 月額プランのProductとPriceを作成

1. **Productを作成**
   - `Products` → `Add Product` をクリック
   - 商品名: **`UGSオンラインスクール 月額プラン`**
   - 説明: `学び → 実践 → 自立を一体化したFP育成プラットフォーム`

2. **Priceを設定**
   - 金額: **¥5,500**
   - 課金タイプ: **`Recurring`** (定期課金)
   - 請求サイクル: **`Monthly`** (毎月)
   - 通貨: `JPY`

3. **Saveして Price IDをコピー**
   - 例: `price_xxxxxxxxx_monthly`
   - このIDは後で使用します

### 2.2 初回登録費用のProductとPriceを作成

1. **Productを作成**
   - `Products` → `Add Product` をクリック
   - 商品名: **`初回登録費用`**
   - 説明: `UGSオンラインスクールの初回のみ課金される登録費用`

2. **Priceを設定**
   - 金額: **¥33,000**
   - 課金タイプ: **`One-time`** (一回限り) ← 重要！
   - 通貨: `JPY`

3. **Saveして Price IDをコピー**
   - 例: `price_xxxxxxxxx_setup`
   - このIDは後で使用します

---

## ステップ3: Webhookの設定

Stripeからアプリケーションにイベントを送信するためのWebhookを設定します。

### 3.1 Webhookエンドポイントを追加

1. **Developers → Webhooks**
   - https://dashboard.stripe.com/test/webhooks

2. **「Add endpoint」をクリック**

3. **エンドポイントURLを入力**
   - ローカル開発の場合:
     ```
     https://your-app.ngrok.io/api/webhooks/stripe
     ```
     ※ ngrokなどのトンネリングツールを使用

   - 本番環境の場合:
     ```
     https://your-domain.com/api/webhooks/stripe
     ```

4. **イベントを選択**
   - 「Select events to listen to」をクリック
   - 以下のイベントを選択:
     - ✅ `checkout.session.completed`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`
     - ✅ `customer.subscription.deleted`

5. **「Add endpoint」をクリック**

### 3.2 Webhook Signing Secretを取得

1. 作成したWebhookエンドポイントをクリック
2. **「Signing secret」セクションを展開**
3. 「Reveal」をクリックしてシークレットをコピー
   - 例: `whsec_xxxxxxxxxxxxx`
4. このシークレットは後で環境変数に設定します

---

## ステップ4: 環境変数の更新

### 4.1 ローカル環境の設定（`.env.local`）

`.env.local`ファイルを開いて、以下の環境変数を更新:

```env
# ============================================
# Stripe設定（新しいアカウント）
# ============================================

# Stripe APIキー（テストモード）
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx          # ← ステップ1.1で取得
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx  # ← ステップ1.1で取得

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx        # ← ステップ3.2で取得

# Price ID - 月額プラン
# （注: コード内で自動検索するため、設定不要）
# 既存のコードが ¥5,500 の月額Priceを自動で探します

# Price ID - 初回登録費用
STRIPE_SETUP_FEE_PRICE_ID=price_xxxxxxxxx_setup  # ← ステップ2.2で取得

# 初回登録費用機能の有効化
NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED=true

# アプリURL
NEXT_PUBLIC_APP_URL=http://localhost:3000        # ローカル開発の場合
```

### 4.2 本番環境の設定（Vercel等）

本番環境にデプロイする場合:

1. **本番モードでステップ1〜3を繰り返す**
   - Stripeを「Live mode」に切り替えて同じ手順を実施

2. **ホスティングサービスの環境変数を更新**

   **Vercelの場合:**
   - Vercelダッシュボード → Settings → Environment Variables
   - 以下を更新:
     - `STRIPE_SECRET_KEY`: 本番用Secret Key
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: 本番用Publishable Key
     - `STRIPE_WEBHOOK_SECRET`: 本番用Webhook Secret
     - `STRIPE_SETUP_FEE_PRICE_ID`: 本番用Setup Fee Price ID
     - `NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED`: `true`
     - `NEXT_PUBLIC_APP_URL`: 本番URL

---

## ステップ5: 動作確認

### 5.1 開発サーバーを再起動

```bash
npm run dev
```

### 5.2 テスト決済を実施

1. **新規ユーザー登録**
   - http://localhost:3000/register にアクセス
   - 登録フォームに入力

2. **チェックアウトページを確認**
   - 金額が **¥38,500** と表示されているか確認
   - 内訳が表示されているか確認

3. **テストカードで決済**
   - カード番号: `4242 4242 4242 4242`
   - 有効期限: 将来の日付
   - CVC: 任意の3桁

4. **決済完了を確認**
   - 決済が成功することを確認
   - 決済完了メールが届くことを確認

### 5.3 Stripeダッシュボードで確認

1. **Paymentsページを確認**
   - 決済が記録されているか確認
   - 金額が ¥38,500 か確認

2. **Invoiceを確認**
   - Invoice詳細を開く
   - 2つの項目が含まれているか確認:
     - 月額利用料: ¥5,500
     - 初回登録費用: ¥33,000

3. **Subscriptionを確認**
   - サブスクリプションが作成されているか確認
   - 次回請求額が ¥5,500 か確認

### 5.4 Webhookイベントを確認

1. **Developers → Webhooks → (作成したエンドポイント)**
   - 「Events」タブを確認
   - 以下のイベントが送信されているか確認:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`

2. **イベントの詳細を確認**
   - 各イベントをクリック
   - 「Response」が `200 OK` になっているか確認

---

## ✅ チェックリスト

すべて完了したか確認してください:

### 設定
- [ ] 新しいStripe APIキーを取得
- [ ] 月額プランのProductとPriceを作成（¥5,500）
- [ ] 初回登録費用のProductとPriceを作成（¥33,000）
- [ ] Webhookエンドポイントを設定
- [ ] Webhook Signing Secretを取得
- [ ] `.env.local`の環境変数を更新
- [ ] 開発サーバーを再起動

### テスト
- [ ] チェックアウトページで金額表示を確認（¥38,500）
- [ ] テストカードで決済を完了
- [ ] Stripeダッシュボードで決済を確認
- [ ] Invoice内訳を確認（2項目）
- [ ] 次回請求額を確認（¥5,500）
- [ ] Webhookイベントを確認（200 OK）
- [ ] 決済完了メールを確認

---

## 🔧 トラブルシューティング

### Q1: チェックアウトページでエラーが出る

**原因**: APIキーが正しく設定されていない

**解決方法**:
1. `.env.local`のAPIキーを確認
2. `sk_test_` で始まっているか確認（テストモード）
3. 開発サーバーを再起動

### Q2: Webhookイベントが届かない

**原因**: Webhook URLが正しくない、またはローカル開発でトンネリングツールを使用していない

**解決方法**:
1. **ローカル開発の場合**: ngrokなどのトンネリングツールを使用
   ```bash
   # ngrokのインストール
   brew install ngrok  # macOS

   # トンネルを開始
   ngrok http 3000

   # 表示されたURLをStripe Webhookエンドポイントに設定
   # 例: https://xxxx.ngrok.io/api/webhooks/stripe
   ```

2. **本番環境の場合**: 正しい本番URLが設定されているか確認

### Q3: 「Price not found」エラーが出る

**原因**: 月額プランのPriceが見つからない

**解決方法**:
1. Stripeダッシュボードで ¥5,500 の月額Priceが作成されているか確認
2. Priceが `active` 状態か確認
3. 通貨が `JPY` か確認
4. 課金タイプが `Recurring` (Monthly) か確認

### Q4: 登録費用が追加されない

**原因**: `STRIPE_SETUP_FEE_PRICE_ID` が正しく設定されていない

**解決方法**:
1. `.env.local`を確認:
   ```env
   STRIPE_SETUP_FEE_PRICE_ID=price_xxxxxxxxxxxxx
   NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED=true
   ```
2. Price IDが `price_` で始まっているか確認
3. 開発サーバーを再起動

---

## 📝 既存データの扱い

### 既存ユーザーへの影響

新しいStripeアカウントに変更しても、**既存ユーザーのサブスクリプションは古いStripeアカウントに残ります**。

#### 既存ユーザーの移行が必要な場合

既存ユーザーを新しいStripeアカウントに移行したい場合は、以下の手順が必要です:

1. **古いアカウントでサブスクリプションをキャンセル**
2. **新しいアカウントで再度サブスクリプションを作成**
3. **ユーザーに再登録してもらう**

ただし、これは**ユーザー体験を損なう**可能性があるため、慎重に検討してください。

#### 推奨アプローチ

- **新規ユーザー**: 新しいStripeアカウントで決済
- **既存ユーザー**: 古いStripeアカウントで継続（移行しない）

両方のStripeアカウントを並行運用することも可能です。

---

## 🎉 完了！

Stripeアカウントの変更が完了しました。

次は本番環境にデプロイする際に、同じ手順を**本番モード**で実施してください。

何か問題があれば、トラブルシューティングセクションを参照してください。

---

**作成日**: 2025年1月
**最終更新**: 2025年1月
**バージョン**: 1.0
