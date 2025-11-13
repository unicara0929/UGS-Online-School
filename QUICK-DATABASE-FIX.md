# データベース接続エラー クイック修正ガイド

## 🚨 現在のエラー

```
FATAL: Tenant or user not found
```

## ✅ クイック修正方法

### ステップ1: 直接接続URLに変更（開発環境用）

`.env.local`の`DATABASE_URL`を以下の形式に変更してください：

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.izyxfdmfqezpntbpjbnp.supabase.co:5432/postgres?connection_limit=20&pool_timeout=30&connect_timeout=30"
```

**重要**: `[PASSWORD]`を実際のSupabaseデータベースパスワードに置き換えてください。

### ステップ2: 開発サーバーを再起動

```bash
# 開発サーバーを停止
pkill -f "next dev"

# 開発サーバーを起動
npm run dev
```

### ステップ3: 再度ログインを試す

ブラウザで http://localhost:3000 にアクセスして、再度ログインを試してください。

## 📝 注意事項

- **直接接続URLは開発環境でのみ使用**: 本番環境（Vercel）ではTransaction Poolerを使用してください
- **パスワードの確認**: Supabaseダッシュボードでデータベースパスワードを確認してください

## 🔍 Supabaseパスワードの確認方法

1. Supabaseダッシュボードにログイン
2. プロジェクト設定 → Database → Database password
3. パスワードを確認またはリセット

## 📋 正しいURL形式の確認

Supabaseダッシュボードから正しい接続URLを取得する方法：

1. Supabaseダッシュボード → Settings → Database
2. Connection string セクション
3. **URI** タブを選択（直接接続用）
4. パスワード部分を実際のパスワードに置き換え

