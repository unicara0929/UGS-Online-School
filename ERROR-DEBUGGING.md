# 🔍 エラー発生時の確認手順

## 確認すべき情報

エラーの原因を特定するために、以下の情報を確認してください：

### 1. ブラウザのコンソールエラー

1. ブラウザで **F12** キーを押して開発者ツールを開く
2. **Console** タブを選択
3. 表示されているエラーメッセージをコピー
4. 特に以下のエラーを確認：
   - `PrismaClientInitializationError`
   - `Can't reach database server`
   - `Connection refused`
   - `Authentication failed`

### 2. Vercelのログ

1. [Vercelダッシュボード](https://vercel.com)にログイン
2. プロジェクト **ugs-online-school** を選択
3. **Logs** タブを選択
4. 最新のログを確認
5. エラーメッセージをコピー

### 3. 接続文字列の確認

Vercelの環境変数 `DATABASE_URL` が正しい形式になっているか確認：

**正しい形式（セッションプーラー）:**
```
postgresql://postgres.izyxfdmfqezpntbpjbnp:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

または

```
postgresql://postgres.izyxfdmfqezpntbpjbnp:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**確認ポイント:**
- `postgres.` で始まっている（直接接続は `postgres:`）
- `pooler.supabase.com` を含んでいる
- パスワード部分が正しい
- 余分なスペースや改行が入っていない

## 🔧 よくある問題と対処法

### 問題1: 認証エラー

**エラーメッセージ:**
- `Authentication failed`
- `password authentication failed`

**対処法:**
1. Supabaseダッシュボードで接続文字列を再取得
2. パスワード部分を確認
3. パスワードに特殊文字が含まれている場合、URLエンコードが必要

### 問題2: 接続プールが無効

**エラーメッセージ:**
- `Can't reach database server`
- `Connection refused`

**対処法:**
1. Supabaseダッシュボードで **Settings** → **Database** に移動
2. **Connection Pooling** セクションを確認
3. 接続プールが有効になっているか確認
4. 無効の場合は有効化

### 問題3: 接続文字列の形式が間違っている

**エラーメッセージ:**
- `Invalid connection string`
- `Malformed connection string`

**対処法:**
1. Supabaseダッシュボードで接続文字列を再取得
2. 完全にコピー＆ペーストする
3. 手動で編集しない

## 📋 次のステップ

1. ブラウザのコンソールエラーを確認
2. Vercelのログを確認
3. 接続文字列の形式を確認
4. エラーメッセージを共有

エラーメッセージを共有していただければ、より具体的な対処法を提案できます。

