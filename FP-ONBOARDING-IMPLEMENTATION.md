# FPエイド向け動画ガイダンス機能の実装

## 概要

FPエイドに昇格したユーザーに対して、動画ガイダンスを必須視聴させる機能を実装しました。

## 実装内容

### 1. データベーススキーマの拡張

**ファイル**: `prisma/schema.prisma`

- `User`テーブルに以下のフィールドを追加：
  - `fpOnboardingCompleted`: Boolean（デフォルト: true、既存ユーザーへの影響を最小化）
  - `fpOnboardingCompletedAt`: DateTime?（完了日時）

**マイグレーション**: `prisma/migrations/add_fp_onboarding_fields.sql`

### 2. FP昇格承認時の処理

**ファイル**: `src/app/api/admin/promotions/fp/[applicationId]/approve/route.ts`

- FP昇格承認時に`fpOnboardingCompleted: false`を設定
- これにより、新規FPエイドは動画ガイダンス未完了として扱われる

### 3. 動画ガイダンスページ

**ファイル**: `src/app/dashboard/fp-onboarding/page.tsx`

- FPエイド向け動画ガイダンスを表示する専用ページ
- 動画の視聴進捗をリアルタイムで表示（Progressバー）
- 90%以上視聴した時点で自動的に完了処理を実行
- 動画終了時にも完了処理を実行

**機能**:
- 動画URLは環境変数`NEXT_PUBLIC_FP_ONBOARDING_VIDEO_URL`で設定
- 視聴進捗の表示（0-100%）
- 完了条件の表示（90%以上）
- エラーハンドリング

### 4. オンボーディングガードコンポーネント

**ファイル**: `src/components/auth/fp-onboarding-guard.tsx`

- FPエイドかつ動画ガイダンス未完了の場合、自動的にガイダンスページにリダイレクト
- ダッシュボードレイアウトに組み込まれ、すべてのダッシュボードページで動作

**ファイル**: `src/app/dashboard/layout.tsx`

- `FPOnboardingGuard`を追加して、ダッシュボード全体でオンボーディングチェックを実行

### 5. APIエンドポイント

#### 5.1 完了状況取得API

**ファイル**: `src/app/api/user/fp-onboarding-status/route.ts`

- `GET /api/user/fp-onboarding-status`
- ユーザーの動画ガイダンス完了状況を取得

#### 5.2 完了記録API

**ファイル**: `src/app/api/user/fp-onboarding/complete/route.ts`

- `POST /api/user/fp-onboarding/complete`
- 動画ガイダンスの視聴完了を記録
- `fpOnboardingCompleted: true`と`fpOnboardingCompletedAt`を設定

### 6. API側のオンボーディングチェック

**ファイル**: `src/lib/auth/api-helpers.ts`

- `checkFPOnboarding`関数を追加
- FPエイドの場合、オンボーディング完了状況をチェック
- 未完了の場合は403エラーを返す

**適用先API**:
- `GET /api/referrals` - 紹介一覧取得
- `POST /api/referrals` - 紹介登録
- `GET /api/contracts` - 契約一覧取得
- `POST /api/contracts` - 契約登録
- `PUT /api/contracts/[contractId]` - 契約更新（自分の契約の場合のみ）

### 7. 既存ユーザーへの影響

- デフォルト値が`true`のため、既存のFPエイドユーザーは自動的に完了済みとして扱われる
- 新規にFPエイドに昇格したユーザーのみ、動画ガイダンスが必須となる

## 使用方法

### 環境変数の設定

`.env.local`に以下を追加：

```env
NEXT_PUBLIC_FP_ONBOARDING_VIDEO_URL=https://example.com/fp-onboarding-video.mp4
```

### データベースマイグレーション

```bash
# Prismaクライアントの再生成
npx prisma generate

# データベースマイグレーション（本番環境の場合）
npx prisma migrate deploy
```

### 動作フロー

1. **FP昇格承認時**:
   - 管理者がFP昇格申請を承認
   - `fpOnboardingCompleted: false`が設定される

2. **ログイン時**:
   - FPエイドユーザーがログイン
   - `FPOnboardingGuard`がオンボーディング状況をチェック
   - 未完了の場合は`/dashboard/fp-onboarding`にリダイレクト

3. **動画視聴**:
   - ユーザーが動画を視聴
   - 視聴進捗がリアルタイムで表示される
   - 90%以上視聴した時点で自動的に完了処理が実行される

4. **完了後**:
   - `fpOnboardingCompleted: true`が設定される
   - 通常のFPエイド機能にアクセス可能になる

5. **APIアクセス時**:
   - FPエイド機能のAPIにアクセスする際、オンボーディング完了状況をチェック
   - 未完了の場合は403エラーを返す

## セキュリティ対策

- **フロントエンド**: `FPOnboardingGuard`で画面遷移を制御
- **バックエンド**: API側でもオンボーディング完了状況をチェック
- **抜け道防止**: クライアント側のチェックだけでは不十分なため、API側でもチェックを実装

## 注意事項

- 動画URLは環境変数で設定する必要があります
- 既存ユーザーは自動的に完了済みとして扱われます
- 動画の視聴判定はブラウザ側の`onTimeUpdate`イベントを使用しています
- 90%以上視聴した時点で完了とみなされます

## 今後の拡張予定

- 動画視聴の詳細なログ記録
- 視聴時間の記録
- 複数の動画ガイダンスへの対応
- 管理者向けの視聴状況レポート

