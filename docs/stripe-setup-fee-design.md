# Unicara Growth Salon：初回登録費用を含む決済フロー設計案

## 📋 目次
1. [現在の実装概要](#現在の実装概要)
2. [要件の整理](#要件の整理)
3. [実現方法の候補](#実現方法の候補)
4. [推奨案とその理由](#推奨案とその理由)
5. [実装時の注意事項](#実装時の注意事項)

---

## 1. 現在の実装概要

### 1.1 決済フローの全体像

```
[登録フォーム] → [仮登録] → [Checkout] → [Stripe決済] → [Webhook] → [登録完了]
```

#### 詳細な流れ

1. **ユーザー登録 (`/src/components/auth/register-form.tsx`)**
   - ユーザーが名前、メール、パスワードを入力
   - 紹介コード（あれば）を取得
   - `PendingUser`としてデータベースに仮保存
   - `/checkout`ページにリダイレクト

2. **チェックアウトページ (`/src/app/checkout/page.tsx`)**
   - 月額5,500円のプラン内容を表示
   - ユーザーが「決済する」ボタンをクリック
   - `/api/create-checkout-session`を呼び出し

3. **Checkout Session作成 (`/src/app/api/create-checkout-session/route.ts`)**
   ```typescript
   const session = await stripe.checkout.sessions.create({
     payment_method_types: ['card'],
     line_items: [{
       price: priceId,  // 月額5,500円のPrice ID
       quantity: 1,
     }],
     mode: 'subscription',  // サブスクリプションモード
     customer_email: email,
     metadata: { userName, userEmail, referralCode },
     success_url: `${APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
     cancel_url: `${APP_URL}/checkout?...`,
     subscription_data: {
       metadata: { userName, userEmail }
     }
   })
   ```

4. **Stripe決済**
   - ユーザーがStripeのチェックアウトページでカード情報入力
   - 初回決済（5,500円）が実行される
   - 成功すると`payment-success`ページにリダイレクト

5. **Webhookイベント処理 (`/src/lib/webhooks/stripe-handlers.ts`)**
   - `checkout.session.completed`: 決済完了メールを送信、紹介登録
   - `invoice.payment_succeeded`: サブスクリプション状態を更新
   - `invoice.payment_failed`: 決済失敗メール送信
   - `customer.subscription.deleted`: キャンセルメール送信

6. **登録完了 (`/src/app/api/complete-registration/route.ts`)**
   - Supabaseユーザー作成
   - Prismaユーザー作成
   - Subscriptionレコード作成
   - PendingUserを削除

### 1.2 現在使用しているStripeの機能

- **Checkout Session**: 決済画面のホスティング
- **Subscription**: 月額課金の管理
- **Price**: 月額5,500円の価格設定
- **Webhook**: イベント駆動での処理
- **Metadata**: カスタムデータの保存（紹介コード等）

### 1.3 現在の課題

- 初回のみ**登録費用33,000円**を追加したい
- ユーザーには**1回の決済フローで完結**させたい（2回決済させたくない）
- 2ヶ月目以降は**月額5,500円のみ**を自動課金

---

## 2. 要件の整理

### 2.1 決済要件

| 項目 | 金額 | タイミング | 備考 |
|------|------|------------|------|
| 初回登録費用 | 33,000円（税込） | 初回のみ | 一回限りの課金 |
| 月額利用料 | 5,500円（税込） | 毎月 | サブスクリプション |
| **初回合計** | **38,500円（税込）** | **初回決済時** | **33,000 + 5,500** |

### 2.2 UX要件

- ✅ ユーザーは**1回の決済フロー**で完結
- ✅ 決済画面で**内訳が明確**に表示される
  - 登録費用: 33,000円
  - 月額利用料（1ヶ月目）: 5,500円
  - 合計: 38,500円
- ✅ 2回目以降は**月額5,500円のみ**が自動請求される

### 2.3 運用・会計要件

- ✅ Stripeダッシュボードで**登録費用と月額費用を区別**できる
- ✅ 売上レポートで**登録費用の集計**が容易
- ✅ 金額変更時の**柔軟な対応**が可能
- ✅ 既存ユーザーへの**影響を最小限**に抑える

---

## 3. 実現方法の候補

### 案A: Checkout Sessionで一回払い + サブスクを同時購入

#### 概要
Stripe Checkout Sessionの`line_items`に、**一回限りの商品**と**サブスクリプション**を同時に含める方法。

#### 実装イメージ
```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [
    {
      price: 'price_xxx',  // 登録費用 33,000円 (one-time)
      quantity: 1,
    },
    {
      price: 'price_yyy',  // 月額5,500円 (recurring)
      quantity: 1,
    }
  ],
  mode: 'subscription',  // サブスクリプションモード
  customer_email: email,
  // ... 他のパラメータ
})
```

#### ユーザー体験
- **決済画面**:
  ```
  登録費用               ¥33,000
  月額利用料（/月）       ¥5,500
  ────────────────────────
  今日の支払い           ¥38,500
  次回以降（毎月）        ¥5,500
  ```
- **決済回数**: 1回
- **請求書**: 初回のinvoiceに両方の項目が含まれる

#### メリット
- ✅ **最もシンプル**で分かりやすい実装
- ✅ ユーザーに**内訳が明確**に表示される
- ✅ Stripeダッシュボードで**登録費用と月額費用を区別**しやすい
- ✅ 既存コードへの**変更が最小限**
- ✅ Stripeの**公式推奨パターン**

#### デメリット
- ⚠️ `mode: 'subscription'`の場合、**一回払いとサブスクの混在が制限される**可能性
  - → **検証が必要**（Stripeのドキュメントによると、`mode: 'subscription'`では一回払いの追加は可能）
- ⚠️ 2つのPrice IDを管理する必要がある

#### 既存コードへの影響
- **変更必要**: `/src/app/api/create-checkout-session/route.ts`
  - line_itemsに登録費用を追加
- **変更必要**: Stripeダッシュボードで新しいPriceを作成
  - 登録費用: 33,000円 (one_time)
- **変更不要**: Webhook処理は既存のまま動作

#### 注意点
- Stripe Checkoutの`mode: 'subscription'`では、**recurring priceが最低1つ必要**
- 複数のline_itemsを含める場合、すべて同じproductに紐づける必要はない

---

### 案B: `subscription_data.add_invoice_items`を使用

#### 概要
サブスクリプション作成時に、**初回のinvoiceにのみ追加料金**を加える方法。

#### 実装イメージ
```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price: 'price_yyy',  // 月額5,500円 (recurring)
    quantity: 1,
  }],
  mode: 'subscription',
  subscription_data: {
    add_invoice_items: [
      {
        price: 'price_xxx',  // 登録費用 33,000円 (one-time)
        quantity: 1,
      }
    ],
    metadata: { ... }
  },
  // ... 他のパラメータ
})
```

#### ユーザー体験
- **決済画面**:
  ```
  月額利用料（/月）       ¥5,500
  登録費用（初回のみ）    ¥33,000
  ────────────────────────
  今日の支払い           ¥38,500
  次回以降（毎月）        ¥5,500
  ```
- **決済回数**: 1回
- **請求書**: 初回のinvoiceに登録費用が追加項目として含まれる

#### メリット
- ✅ **明示的に初回のみの追加料金**として扱える
- ✅ `add_invoice_items`という名前から**意図が明確**
- ✅ サブスクリプションのメインpriceとは**分離されて管理**される
- ✅ Stripeダッシュボードで**登録費用を識別しやすい**

#### デメリット
- ⚠️ Checkout画面での**表示順序が固定**される可能性
- ⚠️ 案Aと比べて**やや複雑**

#### 既存コードへの影響
- **変更必要**: `/src/app/api/create-checkout-session/route.ts`
  - subscription_dataにadd_invoice_itemsを追加
- **変更必要**: Stripeダッシュボードで新しいPriceを作成
  - 登録費用: 33,000円 (one_time)
- **変更不要**: Webhook処理は既存のまま動作

#### 注意点
- `add_invoice_items`は**初回invoiceにのみ**適用される
- この方法も**Stripeの公式サポート**されているパターン

---

### 案C: Payment Linksを使用

#### 概要
Stripe Payment Linksで、一回払い + サブスクの組み合わせリンクを作成する方法。

#### 実装イメージ
```typescript
// Stripeダッシュボードまたは APIでPayment Linkを作成
// 一回払い + サブスクの組み合わせをサポートするか要確認
```

#### ユーザー体験
- **決済画面**: Payment Link専用の画面
- **決済回数**: 1回（可能な場合）

#### メリット
- ✅ **ノーコード**または**最小限のコード**で実装可能
- ✅ URLだけでシェア可能

#### デメリット
- ❌ Payment Linksは**現時点で一回払い + サブスクの混在をサポートしていない**
  - Checkout Sessionを使う必要がある
- ❌ カスタマイズ性が**低い**
- ❌ Metadataの管理が**制限される**（紹介コード等の保存が難しい）

#### 既存コードへの影響
- **大幅な変更が必要**: 現在のフローを大きく変える必要がある

#### 注意点
- **この案は非推奨**: 現時点でのStripe Payment Linksの制約により、要件を満たせない

---

### 案D: サブスクリプションのSetup Feeを使用

#### 概要
Stripeのサブスクリプション作成時に、`setup_future_usage`や特定のパラメータで初回費用を設定する方法。

#### 実装イメージ
```typescript
// Stripe APIでサブスクリプション作成
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: 'price_yyy' }],  // 月額5,500円
  add_invoice_items: [
    { price: 'price_xxx' }  // 登録費用 33,000円
  ]
})
```

#### ユーザー体験
- Checkout Sessionを経由しないため、**カード情報入力のUIが異なる**

#### メリット
- ✅ サーバーサイドで**完全に制御**できる

#### デメリット
- ❌ **Checkout Sessionを使わない**ため、既存フローと大きく異なる
- ❌ PCI DSS対応のため、**カード情報を自前で扱う**必要がある（非推奨）
- ❌ 実装が**複雑**

#### 既存コードへの影響
- **大幅な変更が必要**: フロー全体を再設計

#### 注意点
- **この案は非推奨**: セキュリティとUXの観点から、Checkout Sessionの利用が推奨される

---

## 4. 推奨案とその理由

### 🎯 推奨: **案B - `subscription_data.add_invoice_items`を使用**

#### 推奨理由

| 観点 | 評価 | 理由 |
|------|------|------|
| **UX** | ⭐⭐⭐⭐⭐ | ユーザーは1回の決済で完結、内訳も明確 |
| **実装コスト** | ⭐⭐⭐⭐⭐ | 既存コードへの変更が最小限 |
| **運用のしやすさ** | ⭐⭐⭐⭐⭐ | 登録費用と月額費用が明確に区別される |
| **柔軟性** | ⭐⭐⭐⭐⭐ | 金額変更時もPriceを差し替えるだけ |
| **Stripeベストプラクティス** | ⭐⭐⭐⭐⭐ | 公式サポートされているパターン |

#### 具体的な利点

1. **明示的な意図**
   - `add_invoice_items`という名前から、「初回invoiceにのみ追加される項目」であることが明確
   - コードレビュー時に意図が伝わりやすい

2. **既存コードへの影響が小さい**
   - `/src/app/api/create-checkout-session/route.ts`の`subscription_data`に追加するだけ
   - Webhook処理は**一切変更不要**

3. **会計・運用面での優位性**
   - Stripeダッシュボードで「登録費用」として明確に識別可能
   - レポート作成時に登録費用と月額費用を分けて集計しやすい

4. **既存ユーザーへの影響なし**
   - 既存のサブスクリプションには影響しない
   - 新規登録者のみに適用される

#### 案Aとの比較

| 項目 | 案A（line_itemsに2つ） | 案B（add_invoice_items） |
|------|------------------------|--------------------------|
| 実装難易度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 意図の明確さ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Stripeサポート | ✅ | ✅ |
| 推奨度 | 🥈 | 🥇 |

**結論**: 両方とも実装可能だが、**案Bの方が意図が明確**で、将来的なメンテナンス性が高い。

---

## 5. 実装時の注意事項

### 5.1 必要な準備

#### Stripeダッシュボードでの設定

1. **新しいPriceを作成**
   ```
   商品名: 初回登録費用
   価格: ¥33,000
   課金タイプ: One-time（一回限り）
   Price ID: price_xxx (メモしておく)
   ```

2. **既存の月額Priceを確認**
   ```
   商品名: Unicara Growth Salon 月額プラン
   価格: ¥5,500
   課金タイプ: Recurring（月次）
   Price ID: price_yyy
   ```

### 5.2 コード変更箇所

#### `/src/app/api/create-checkout-session/route.ts`

**変更前:**
```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price: priceId,  // 月額5,500円
    quantity: 1,
  }],
  mode: 'subscription',
  customer_email: email,
  metadata: sessionMetadata,
  success_url: `...`,
  cancel_url: `...`,
  subscription_data: {
    metadata: sessionMetadata,
  },
})
```

**変更後:**
```typescript
const MONTHLY_PRICE_ID = 'price_yyy'  // 月額5,500円
const SETUP_FEE_PRICE_ID = 'price_xxx'  // 登録費用33,000円

const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price: MONTHLY_PRICE_ID,
    quantity: 1,
  }],
  mode: 'subscription',
  customer_email: email,
  metadata: sessionMetadata,
  success_url: `...`,
  cancel_url: `...`,
  subscription_data: {
    add_invoice_items: [
      {
        price: SETUP_FEE_PRICE_ID,
        quantity: 1,
      }
    ],
    metadata: sessionMetadata,
  },
})
```

### 5.3 テスト計画

#### テストケース

| # | テスト内容 | 期待結果 |
|---|-----------|---------|
| 1 | 新規ユーザーが登録 | 初回決済: ¥38,500（33,000 + 5,500） |
| 2 | 初回決済完了後の確認 | Stripeダッシュボードで2つの項目が表示される |
| 3 | 2ヶ月目の請求 | ¥5,500のみ請求される（登録費用なし） |
| 4 | Webhook処理 | checkout.session.completed が正常に動作 |
| 5 | メール送信 | 決済完了メールが送信される |
| 6 | ユーザー登録完了 | PrismaとSupabaseにユーザーが作成される |

#### テスト環境での確認事項

1. **Stripeテストモード**で動作確認
2. テストカード番号: `4242 4242 4242 4242`
3. 初回決済額が**¥38,500**であることを確認
4. Invoiceの内訳を確認:
   - Line 1: 月額利用料 ¥5,500
   - Line 2: 登録費用 ¥33,000
5. 次回請求予定額が**¥5,500**であることを確認

### 5.4 既存ユーザーへの影響

- ✅ **影響なし**: 既存のサブスクリプションは変更されない
- ✅ 新規登録フローのみに適用される
- ✅ 既存のWebhook処理はそのまま動作

### 5.5 金額変更時の対応

今後、金額を変更したい場合:

1. **Stripeダッシュボードで新しいPriceを作成**
   - 古いPriceは`archive`（非アクティブ化）
   - 新しいPriceのIDを取得

2. **環境変数またはコードでPrice IDを更新**
   ```typescript
   const MONTHLY_PRICE_ID = 'price_new_monthly'
   const SETUP_FEE_PRICE_ID = 'price_new_setup'
   ```

3. **既存ユーザーには影響なし**
   - 既存のサブスクリプションは古いPriceのまま継続

### 5.6 運用・モニタリング

#### Stripeダッシュボードでの確認項目

1. **売上レポート**
   - 登録費用と月額費用を分けて集計
   - フィルター: Product name = "初回登録費用"

2. **サブスクリプション一覧**
   - 新規登録者のサブスクリプションを確認
   - 初回invoiceの金額が¥38,500か確認

3. **失敗した決済**
   - 初回決済失敗の監視
   - 必要に応じてリトライ

#### ログ監視

```typescript
// 追加するログ例
console.log('Creating checkout session with setup fee:', {
  monthlyPrice: MONTHLY_PRICE_ID,
  setupFee: SETUP_FEE_PRICE_ID,
  totalAmount: '¥38,500'
})
```

---

## 6. 代替案の検討（参考）

### もし案Aを選択する場合

**変更箇所:**
```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [
    {
      price: SETUP_FEE_PRICE_ID,  // 登録費用 33,000円
      quantity: 1,
    },
    {
      price: MONTHLY_PRICE_ID,  // 月額5,500円
      quantity: 1,
    }
  ],
  mode: 'subscription',
  // ... 他は同じ
})
```

**注意点:**
- Checkout画面での表示順序が「登録費用 → 月額料金」となる
- 意味的には案Bと同じ結果になるが、`add_invoice_items`の方が意図が明確

---

## 7. まとめ

### 実装推奨事項

1. ✅ **案B（`subscription_data.add_invoice_items`）を採用**
2. ✅ Stripeダッシュボードで「初回登録費用」Priceを作成
3. ✅ `/src/app/api/create-checkout-session/route.ts`を修正
4. ✅ テストモードで十分にテスト
5. ✅ 本番環境で段階的にロールアウト

### 期待される効果

- 📈 初回登録費用による**収益向上**
- 😊 ユーザーは**1回の決済で完結**（UX向上）
- 📊 **会計処理が明確**（登録費用と月額費用を分けて管理）
- 🔧 **運用負荷が低い**（既存フローへの影響が最小限）

### 次のステップ

1. **Stripeダッシュボードで設定** (所要時間: 10分)
2. **コード修正** (所要時間: 30分)
3. **テスト** (所要時間: 1時間)
4. **本番デプロイ** (所要時間: 15分)
5. **モニタリング開始** (継続的)

---

**作成日**: 2025年1月
**最終更新**: 2025年1月
**作成者**: Claude (AI Assistant)
**レビュー**: 未実施
