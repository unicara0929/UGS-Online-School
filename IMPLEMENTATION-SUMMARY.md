# 実装内容の確認方法

## 🎯 実装した機能（バックエンド）

今回の実装は主に**バックエンドAPI**と**サービスロジック**です。UIには直接的な変更はありませんが、以下の機能が利用可能になりました：

### 1. 紹介システム
- **API**: `/api/referrals/*`
- **機能**: 紹介登録・承認・一覧取得
- **確認方法**: ブラウザの開発者ツールでAPIを直接呼び出し

### 2. 契約実績管理
- **API**: `/api/contracts/*`
- **機能**: 契約登録・更新・削除
- **確認方法**: APIエンドポイントを直接呼び出し

### 3. 報酬計算ロジック
- **サービス**: `src/lib/services/compensation-calculator.ts`
- **API**: `/api/admin/compensations/*`
- **機能**: 月次報酬の自動計算・承認・支払い
- **確認方法**: ADMINユーザーで報酬生成APIを呼び出し

### 4. 昇格フロー自動化
- **サービス**: `src/lib/services/promotion-eligibility.ts`
- **API**: `/api/promotions/*`
- **機能**: 昇格条件チェック・申請・承認
- **確認方法**: 昇格可能性チェックAPIを呼び出し

### 5. 通知システム
- **サービス**: `src/lib/services/notification-service.ts`
- **API**: `/api/notifications/*`
- **機能**: 通知作成・一覧取得・既読管理
- **確認方法**: 通知APIを呼び出し

### 6. Stripe拡張
- **Webhook**: `/api/webhooks/stripe`
- **機能**: 紹介コードの自動登録、サブスクリプション状態の自動更新
- **確認方法**: Stripe決済完了時に自動実行

## 🔍 確認できる変更点

### データベースレベル
1. **新しいテーブルが追加されました**:
   - `referrals` - 紹介データ
   - `contracts` - 契約データ
   - `notifications` - 通知データ
   - `promotion_applications` - 昇格申請データ

2. **ユーザーテーブルに新フィールド**:
   - `referralCode` - 紹介コード（ユーザー登録時に自動生成）
   - `bankAccount` - 振込口座情報

### APIエンドポイント
以下のAPIエンドポイントが利用可能になりました：

```
GET/POST /api/referrals
POST /api/referrals/register
POST /api/referrals/[referralId]/approve
POST /api/referrals/[referralId]/reject

GET/POST /api/contracts
PUT/DELETE /api/contracts/[contractId]

GET /api/notifications
POST /api/notifications/[notificationId]/read
POST /api/notifications/mark-all-read

GET /api/promotions/eligibility
POST /api/promotions/apply

POST /api/admin/compensations/generate
POST /api/admin/compensations/[compensationId]/approve
POST /api/admin/compensations/[compensationId]/pay

POST /api/admin/promotions/[applicationId]/approve
POST /api/admin/promotions/[applicationId]/reject
```

## 🧪 動作確認方法

### 方法1: ブラウザの開発者ツールでAPIを直接呼び出す

1. ブラウザでサイトを開く
2. F12キーで開発者ツールを開く
3. Consoleタブで以下を実行：

```javascript
// 通知一覧を取得（ユーザーIDが必要）
fetch('/api/notifications?userId=YOUR_USER_ID')
  .then(res => res.json())
  .then(data => console.log('通知一覧:', data))

// 昇格可能性をチェック
fetch('/api/promotions/eligibility?userId=YOUR_USER_ID&targetRole=manager')
  .then(res => res.json())
  .then(data => console.log('昇格可能性:', data))
```

### 方法2: テストスクリプトを実行

ローカル環境で以下を実行：

```bash
# データベースレベルのテスト
npx tsx scripts/test-api.ts

# HTTP APIのテスト（開発サーバー起動中）
npx tsx scripts/test-api-http.ts
```

### 方法3: Prisma Studioでデータベースを確認

```bash
npx prisma studio
```

ブラウザで `http://localhost:5555` にアクセスして、新しいテーブルを確認できます。

## 📝 次のステップ（UI実装）

現在はバックエンドのみ実装済みです。UIコンポーネントを実装すると、以下のような画面が追加されます：

1. **紹介ダッシュボード** (`/dashboard/referrals`)
   - 紹介一覧表示
   - 紹介コード表示・コピー
   - 紹介リンク生成

2. **契約管理画面** (`/dashboard/contracts`)
   - 契約一覧表示
   - 契約登録フォーム
   - 契約報酬の確認

3. **通知一覧画面** (`/dashboard/notifications`)
   - 通知一覧表示
   - 既読/未読の管理
   - 通知のフィルタリング

4. **昇格申請画面** (`/dashboard/promotion`)
   - 昇格条件の表示
   - 昇格申請ボタン
   - 申請状況の確認

5. **報酬管理画面（ADMIN）** (`/dashboard/admin/compensations`)
   - 報酬一覧表示
   - 報酬生成機能
   - 報酬承認・支払い機能

## 💡 まとめ

**今回の実装は「基盤」です**。UIコンポーネントを実装すると、これらの機能がユーザーに見える形で利用できるようになります。

現在は：
- ✅ バックエンドAPIが動作している
- ✅ データベーススキーマが拡張された
- ✅ サービスロジックが実装された
- ⏳ UIコンポーネントは未実装（既存のUIはそのまま動作）

UIコンポーネントの実装も進めますか？

