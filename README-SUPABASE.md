# Supabase + Prisma セットアップガイド

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトの設定から以下の情報を取得：
   - Project URL
   - API Keys (anon key, service role key)
   - Database Password

## 2. 環境変数の設定

`.env.local`ファイルに以下の情報を設定してください：

### 接続プールを使用する場合（推奨・本番環境）

**重要**: 接続プール設定（`connection_limit`、`pool_timeout`、`connect_timeout`）を含める必要があります。

```env
# Supabase設定（接続プール使用）
# 注意: aws-0 を使用し、ポート 6543 を指定してください
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=20&pool_timeout=30&connect_timeout=30"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
```

**接続プール設定パラメータの説明**:
- `pgbouncer=true`: Transaction Poolerを使用することを明示
- `connection_limit=20`: サーバーレス環境での同時接続数（推奨: 20）
- `pool_timeout=30`: 接続プールから接続を取得するまでのタイムアウト（秒）
- `connect_timeout=30`: データベースへの接続確立までのタイムアウト（秒）

**よくある間違い**:
- ❌ `aws-1` を使用している → ✅ `aws-0` に変更
- ❌ ポート `5432` を使用している → ✅ ポート `6543` に変更（Transaction Pooler用）
- ❌ 接続プール設定パラメータが含まれていない → ✅ 上記のパラメータを追加

### 直接接続を使用する場合（開発環境・接続プールが使用できない場合）

```env
# Supabase設定（直接接続）
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
```

### 接続文字列の取得方法

1. Supabaseダッシュボードにログイン
2. **Settings > Database** に移動
3. **Connection string** セクションで以下を選択：
   - **URI**: 直接接続用のURL
   - **Connection pooling**: 接続プール用のURL（推奨）
4. パスワード部分 `[YOUR-PASSWORD]` を実際のパスワードに置き換え

### 設定例：
```env
# 接続プール使用（推奨・本番環境）
# 重要: 接続プール設定パラメータを含めること
DATABASE_URL="postgresql://postgres.abcdefghijklmnop:yourpassword123@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=20&pool_timeout=30&connect_timeout=30"
DIRECT_URL="postgresql://postgres:yourpassword123@db.abcdefghijklmnop.supabase.co:5432/postgres"

# 直接接続（開発環境・接続プールが使用できない場合）
# 直接接続の場合も接続プール設定パラメータを含めることを推奨
DATABASE_URL="postgresql://postgres:yourpassword123@db.abcdefghijklmnop.supabase.co:5432/postgres?connection_limit=20&pool_timeout=30&connect_timeout=30"
DIRECT_URL="postgresql://postgres:yourpassword123@db.abcdefghijklmnop.supabase.co:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**重要**: 
- 本番環境（Vercel）では接続プールの使用を強く推奨します
- 接続プールが使用できない場合は、直接接続URLを使用してください
- 接続エラーが発生する場合は、`SUPABASE-CONNECTION-GUIDE.md`を参照してください

## 3. データベースマイグレーション

環境変数を設定後、以下のコマンドを実行：

```bash
# Prismaクライアントを生成
npx prisma generate

# データベースにマイグレーションを適用
npx prisma db push

# データベースの状態を確認
npx prisma studio
```

## 4. 初期データの投入

以下のコマンドでサンプルデータを投入できます：

```bash
npx prisma db seed
```

## 5. データベースモデル

### 主要なモデル：
- **User**: ユーザー情報（ロール管理）
- **Subscription**: Stripeサブスクリプション情報
- **Course**: コース情報
- **Lesson**: レッスン情報
- **CourseProgress**: 学習進捗
- **Event**: イベント情報
- **EventRegistration**: イベント登録
- **Compensation**: 報酬情報

### ユーザーロール：
- **MEMBER**: 一般メンバー
- **FP**: FPエイド
- **MANAGER**: マネージャー
- **ADMIN**: 管理者

## 6. 開発時の注意点

- 本番環境では`SUPABASE_SERVICE_ROLE_KEY`を適切に管理してください
- データベースのバックアップを定期的に取ることを推奨します
- Prisma Studioでデータベースの内容を確認できます

## 7. 接続エラーのトラブルシューティング

接続エラーが発生する場合は、`SUPABASE-CONNECTION-GUIDE.md`を参照してください。
