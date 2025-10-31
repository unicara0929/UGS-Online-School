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

```env
# Supabase設定
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
```

### 設定例：
```env
DATABASE_URL="postgresql://postgres:yourpassword123@db.abcdefghijklmnop.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:yourpassword123@db.abcdefghijklmnop.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

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
