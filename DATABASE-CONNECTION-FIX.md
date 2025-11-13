# データベース接続エラー修正ガイド

## エラー内容

```
FATAL: Tenant or user not found
```

このエラーは、Supabaseの接続URLのユーザー名形式が間違っていることを示しています。

## 原因

`.env.local`の`DATABASE_URL`のユーザー名形式が正しくない可能性があります。

現在の形式：
```
postgresql://postgres.izyxfdmfqezpntbpjbnp:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=20&pool_timeout=30&connect_timeout=30
```

## 解決方法

### 方法1: Supabaseダッシュボードから正しいURLを取得

1. Supabaseダッシュボードにログイン
2. プロジェクト設定 → Database → Connection string
3. **Transaction Pooler**を選択
4. **Connection pooling**タブで、正しいURLをコピー

正しい形式の例：
```
postgresql://postgres.izyxfdmfqezpntbpjbnp:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 方法2: 直接接続URLを使用（一時的な解決策）

Transaction Poolerで問題が続く場合は、直接接続URLを使用できます：

```
postgresql://postgres:[PASSWORD]@db.izyxfdmfqezpntbpjbnp.supabase.co:5432/postgres?connection_limit=20&pool_timeout=30&connect_timeout=30
```

**注意**: 直接接続はサーバーレス環境では推奨されませんが、開発環境では動作します。

## 確認事項

1. **パスワードが正しいか**: Supabaseのパスワードが正しく設定されているか確認
2. **プロジェクト参照ID**: `izyxfdmfqezpntbpjbnp`が正しいか確認
3. **リージョン**: `ap-northeast-1`が正しいか確認

## 修正後の確認

修正後、開発サーバーを再起動してください：

```bash
# 開発サーバーを停止
pkill -f "next dev"

# 開発サーバーを起動
npm run dev
```

その後、再度ログインを試してください。
