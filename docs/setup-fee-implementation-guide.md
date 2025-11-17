# 初回登録費用（¥33,000）実装ガイド

## 📋 実装完了内容

### ✅ 完了した変更

1. **メール文字化け修正**
   - すべてのメール送信にUTF-8エンコーディングを明示的に指定
   - HTML metaタグとnodemailerの両方で対応

2. **決済セッション作成API**
   - `add_invoice_items`を使用して初回invoiceに登録費用を追加
   - 環境変数で有効/無効を切り替え可能

3. **チェックアウトページ**
   - 登録費用の内訳表示を追加
   - 合計金額（¥38,500）の明示
   - 2ヶ月目以降の金額も表示

---

## 🚀 セットアップ手順

### ステップ1: Stripeダッシュボードでの設定

1. **Stripeダッシュボードにログイン**
   - https://dashboard.stripe.com/

2. **新しいProductを作成**
   - `Products` → `Add Product` をクリック
   - 商品名: `初回登録費用` または `UGS初回登録料`
   - 説明: `UGSオンラインスクールの初回のみ課金される登録費用`

3. **Priceを作成**
   - Price設定:
     - 金額: `¥33,000`
     - 課金タイプ: **`One-time`** (一回限り) ← 重要！
     - 通貨: `JPY`
   - 「Save product」をクリック

4. **Price IDをコピー**
   - 作成したPriceの詳細画面に移動
   - Price ID（`price_xxxxxxxxxxxxx`の形式）をコピー
   - このIDを後で使用します

### ステップ2: 環境変数の設定

#### ローカル開発環境（`.env.local`）

```.env
# 既存の環境変数はそのまま...

# ============================================
# 初回登録費用の設定
# ============================================

# Stripe登録費用のPrice ID（ステップ1で取得したID）
STRIPE_SETUP_FEE_PRICE_ID=price_xxxxxxxxxxxxx

# 登録費用機能の有効化フラグ（"true" で有効、"false" または未設定で無効）
NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED=true
```

#### 本番環境（Vercelなどのホスティング）

環境変数を追加:
- `STRIPE_SETUP_FEE_PRICE_ID`: `price_xxxxxxxxxxxxx`
- `NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED`: `true`

---

## ✅ テスト手順

### 1. テストモードでの確認

1. **Stripeをテストモードに切り替え**
   - Stripeダッシュボード左上のトグルで「Test mode」を選択

2. **テスト用Price IDを取得**
   - テストモードで上記のステップ1を実行
   - テスト用のPrice ID（`price_xxxxxxxxxxxxx`）を取得

3. **環境変数を設定**
   ```.env.local
   STRIPE_SETUP_FEE_PRICE_ID=price_xxxxxxxxxxxxx  # テスト用Price ID
   NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED=true
   ```

4. **開発サーバーを再起動**
   ```bash
   npm run dev
   ```

5. **登録フローをテスト**
   - 新規ユーザー登録ページにアクセス
   - チェックアウトページで**¥38,500**が表示されることを確認
   - 内訳が表示されることを確認:
     - 初回登録費用: ¥33,000
     - 月額利用料（1ヶ月目）: ¥5,500
   - Stripeテストカード番号で決済: `4242 4242 4242 4242`

6. **Stripeダッシュボードで確認**
   - `Payments` → 最新の決済を確認
   - 金額が **¥38,500** であることを確認
   - Invoice詳細を開く
   - 2つの項目が含まれていることを確認:
     - Line 1: 月額利用料 ¥5,500
     - Line 2: 初回登録費用 ¥33,000

7. **2ヶ月目の請求を確認**
   - Stripeダッシュボードで`Subscriptions`を確認
   - 次回請求額が **¥5,500** になっていることを確認

### 2. チェック項目

| # | 確認項目 | 期待結果 | ✓ |
|---|---------|---------|---|
| 1 | チェックアウトページの表示金額 | ¥38,500 | □ |
| 2 | 内訳の表示 | 登録費用¥33,000 + 月額¥5,500 | □ |
| 3 | 決済完了 | 成功 | □ |
| 4 | 決済金額 | ¥38,500 | □ |
| 5 | Invoice項目数 | 2項目 | □ |
| 6 | 次回請求額 | ¥5,500 | □ |
| 7 | ユーザー登録完了 | 成功 | □ |
| 8 | メール送信 | 文字化けなし | □ |

---

## 🔄 本番環境へのデプロイ

### 1. 本番用Priceの作成

1. **Stripeを本番モードに切り替え**
   - Stripeダッシュボード左上のトグルで「Live mode」を選択

2. **本番用Priceを作成**
   - テストモードと同じ手順でProductとPriceを作成
   - 本番用のPrice ID（`price_xxxxxxxxxxxxx`）を取得

### 2. 本番環境の環境変数を設定

**Vercelの場合:**
1. Vercelダッシュボードを開く
2. プロジェクト → Settings → Environment Variables
3. 以下を追加:
   - Variable: `STRIPE_SETUP_FEE_PRICE_ID`
   - Value: `price_xxxxxxxxxxxxx`（本番用Price ID）
   - Environment: `Production`

   - Variable: `NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED`
   - Value: `true`
   - Environment: `Production`

4. Save

### 3. デプロイ

```bash
git add .
git commit -m "feat: 初回登録費用33,000円を実装"
git push origin main
```

### 4. 本番環境でテスト

1. 少額のテスト決済を実施（実際のカードを使用）
2. すぐにキャンセルまたは返金

---

## 🛠️ トラブルシューティング

### Q1: チェックアウトページで金額が変わらない（¥5,500のまま）

**原因**: 環境変数が正しく設定されていない

**解決方法**:
1. `.env.local`に`NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED=true`が設定されているか確認
2. 開発サーバーを再起動（環境変数変更後は必須）
3. ブラウザのキャッシュをクリア

### Q2: 決済時にエラーが発生する

**原因**: `STRIPE_SETUP_FEE_PRICE_ID`が正しくない

**解決方法**:
1. Price IDが正しいか確認（`price_`で始まる）
2. テストモードと本番モードのPrice IDを混同していないか確認
3. StripeダッシュボードでそのPrice IDが有効か確認

### Q3: Stripeのinvoiceに登録費用が表示されない

**原因**: `add_invoice_items`が正しく設定されていない

**解決方法**:
1. サーバーログを確認:
   ```
   ✅ Setup fee added: price_xxxxxxxxxxxxx
   💰 Total first payment: ¥38,500 (¥33,000 + ¥5,500)
   ```
   このログが表示されていれば正常
2. ログに`⚠️ No setup fee configured`が表示される場合、環境変数を確認

### Q4: 既存ユーザーにも登録費用が請求されてしまう

**安心してください**: 既存のサブスクリプションには**一切影響ありません**。

- `add_invoice_items`は**新規サブスクリプション作成時のみ**適用されます
- 既存のサブスクリプションは引き続き月額¥5,500のみ請求されます

---

## 📊 運用・モニタリング

### Stripeダッシュボードでの確認

1. **売上レポート**
   - `Reports` → `Balance`
   - フィルター: Product = "初回登録費用"
   - 登録費用の合計売上を確認

2. **サブスクリプション一覧**
   - `Subscriptions` → 新規登録者を確認
   - 初回invoiceの金額が¥38,500か確認

3. **失敗した決済**
   - `Payments` → `Failed`
   - 初回決済失敗をモニタリング

### ログの確認

開発環境のターミナルまたはVercelのログで以下を確認:

```
Creating checkout session with price: price_yyy
✅ Setup fee added: price_xxx
💰 Total first payment: ¥38,500 (¥33,000 + ¥5,500)
Checkout session created: cs_test_...
```

---

## 🔧 登録費用の無効化方法

登録費用を一時的に無効にしたい場合:

### 方法1: 環境変数で無効化（推奨）

```.env.local
NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED=false
```

または環境変数を削除:
```bash
# NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED を削除
```

### 方法2: Price IDを削除

```.env.local
# STRIPE_SETUP_FEE_PRICE_ID をコメントアウト
# STRIPE_SETUP_FEE_PRICE_ID=price_xxxxxxxxxxxxx
```

どちらの方法でも、チェックアウトページは自動的に**¥5,500のみ**の表示に戻ります。

---

## 📝 今後の変更

### 金額を変更したい場合

1. **Stripeで新しいPriceを作成**
   - 例: 登録費用を¥50,000に変更
   - 新しいPrice ID: `price_new_setup_fee`

2. **環境変数を更新**
   ```.env.local
   STRIPE_SETUP_FEE_PRICE_ID=price_new_setup_fee
   ```

3. **チェックアウトページの表示を更新**
   - `/src/app/checkout/page.tsx` の金額表示を修正

### 既存ユーザーへの影響

- ✅ **既存のサブスクリプションには影響なし**
- ✅ 新規登録者のみ新しい金額が適用される

---

## 🎉 完了！

これで初回登録費用の実装は完了です。以下を確認してください:

- [x] Stripeで登録費用Priceを作成
- [x] 環境変数を設定
- [x] テストモードで動作確認
- [x] 本番環境にデプロイ
- [x] 本番環境で最終確認

何か問題があれば、トラブルシューティングセクションを参照してください。

---

**作成日**: 2025年1月
**最終更新**: 2025年1月
**バージョン**: 1.0
