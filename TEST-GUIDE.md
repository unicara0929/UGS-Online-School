# テストと動作確認ガイド

## 前提条件

1. 開発サーバーが起動していること
   ```bash
   npm run dev
   ```

2. データベースが同期されていること
   ```bash
   npx prisma db push --accept-data-loss
   npx prisma generate
   ```

## テスト実行方法

### 1. データベースレベルのテスト

Prisma Clientを使用した直接的なテスト：

```bash
npx tsx scripts/test-api.ts
```

このテストでは以下を確認します：
- ✅ テストユーザーの作成
- ✅ 紹介システム（登録・承認・一覧取得）
- ✅ 契約実績管理（登録・一覧取得）
- ✅ 報酬計算ロジック
- ✅ 昇格フロー（条件チェック）
- ✅ 通知システム（作成・一覧取得）

### 2. HTTP APIエンドポイントのテスト

開発サーバーが起動している状態で実行：

```bash
npx tsx scripts/test-api-http.ts
```

このテストでは以下を確認します：
- ✅ 紹介API (`GET /api/referrals`)
- ✅ 契約API (`GET /api/contracts`)
- ✅ 通知API (`GET /api/notifications`)
- ✅ 昇格API (`GET /api/promotions/eligibility`)

## 手動テスト手順

### 紹介システムのテスト

1. **紹介を登録**
   ```bash
   curl -X POST http://localhost:3000/api/referrals/register \
     -H "Content-Type: application/json" \
     -d '{
       "referralCode": "TESTREF01",
       "referredUserId": "USER_ID"
     }'
   ```

2. **紹介一覧を取得**
   ```bash
   curl http://localhost:3000/api/referrals?userId=USER_ID
   ```

3. **紹介を承認（ADMIN）**
   ```bash
   curl -X POST http://localhost:3000/api/referrals/REFERRAL_ID/approve \
     -H "Content-Type: application/json"
   ```

### 契約実績管理のテスト

1. **契約を登録**
   ```bash
   curl -X POST http://localhost:3000/api/contracts \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "USER_ID",
       "contractNumber": "CONTRACT-001",
       "contractType": "INSURANCE",
       "signedAt": "2024-01-15T00:00:00Z",
       "amount": 100000
     }'
   ```

2. **契約一覧を取得**
   ```bash
   curl http://localhost:3000/api/contracts?userId=USER_ID
   ```

### 報酬計算のテスト

1. **月次報酬を生成（ADMIN）**
   ```bash
   curl -X POST http://localhost:3000/api/admin/compensations/generate \
     -H "Content-Type: application/json" \
     -d '{
       "month": "2024-01"
     }'
   ```

### 昇格フローのテスト

1. **昇格可能性をチェック**
   ```bash
   curl "http://localhost:3000/api/promotions/eligibility?userId=USER_ID&targetRole=manager"
   ```

2. **昇格申請**
   ```bash
   curl -X POST http://localhost:3000/api/promotions/apply \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "USER_ID",
       "targetRole": "manager"
     }'
   ```

### 通知システムのテスト

1. **通知一覧を取得**
   ```bash
   curl http://localhost:3000/api/notifications?userId=USER_ID
   ```

2. **通知を既読にする**
   ```bash
   curl -X POST http://localhost:3000/api/notifications/NOTIFICATION_ID/read \
     -H "Content-Type: application/json"
   ```

## テストデータの確認

Prisma Studioでデータベースの内容を確認：

```bash
npx prisma studio
```

ブラウザで `http://localhost:5555` にアクセスして、以下のテーブルを確認できます：
- `referrals` - 紹介データ
- `contracts` - 契約データ
- `notifications` - 通知データ
- `promotion_applications` - 昇格申請データ
- `compensations` - 報酬データ

## トラブルシューティング

### エラー: "テーブルが見つかりません"

Prisma Clientを再生成してください：
```bash
npx prisma generate
```

### エラー: "開発サーバーが起動していない"

開発サーバーを起動してください：
```bash
npm run dev
```

### エラー: "テストユーザーが見つかりません"

先にデータベースレベルのテストを実行してください：
```bash
npx tsx scripts/test-api.ts
```

