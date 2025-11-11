# 🚨 Vercelデータベース接続URLの緊急修正

## 現在のエラー

```
Can't reach database server at `aws-1-ap-northeast-1.pooler.supabase.com:5432`
```

## 問題点

1. **接続プーラーのURL形式が間違っている**
   - 現在: `aws-1-ap-northeast-1.pooler.supabase.com:5432` ❌
   - 正しい: `aws-0-ap-northeast-1.pooler.supabase.com:6543` ✅

2. **ポート番号が間違っている**
   - 接続プーラーはポート `6543` を使用する必要があります
   - ポート `5432` は直接接続用です

## 🔧 修正手順

### ステップ1: Supabaseダッシュボードで接続文字列を取得

1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. **Settings** → **Database** に移動
4. **Connection string** セクションを開く
5. **Connection pooling** タブを選択
6. **Session mode** を選択
7. 接続文字列をコピー

### ステップ2: Vercelの環境変数を更新

1. [Vercelダッシュボード](https://vercel.com)にログイン
2. プロジェクト **ugs-online-school** を選択
3. **Settings** → **Environment Variables** に移動
4. `DATABASE_URL` を探す
5. **Edit** をクリック
6. 以下のいずれかの形式に更新：

#### オプションA: 接続プーラーを使用（推奨）

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=30
```

**重要:**
- `aws-0`（ゼロ）を使用（`aws-1` ではない）
- ポートは `6543`（`5432` ではない）
- `?pgbouncer=true&connect_timeout=30` を追加

#### オプションB: 直接接続を使用（接続プーラーが使用できない場合）

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?connect_timeout=30
```

**重要:**
- ポートは `5432`
- `?connect_timeout=30` を追加

### ステップ3: 環境変数の確認

以下の環境変数がすべて設定されていることを確認：

- ✅ `DATABASE_URL`（上記のいずれかの形式）
- ✅ `DIRECT_URL`（直接接続URL、例: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`）
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### ステップ4: デプロイを再実行

1. Vercelダッシュボードで **Deployments** タブに移動
2. 最新のデプロイメントを選択
3. **Redeploy** をクリック
4. ビルドが成功するまで待つ

## 📋 接続URLの形式チェックリスト

### ✅ 正しい接続プーラーURL

```
postgresql://postgres.izyxfdmfqezpntbpjbnp:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=30
```

**確認ポイント:**
- [ ] `aws-0`（ゼロ）を使用
- [ ] ポート `6543` を使用
- [ ] `?pgbouncer=true&connect_timeout=30` が含まれている

### ✅ 正しい直接接続URL

```
postgresql://postgres:[PASSWORD]@db.izyxfdmfqezpntbpjbnp.supabase.co:5432/postgres?connect_timeout=30
```

**確認ポイント:**
- [ ] `db.` で始まる
- [ ] ポート `5432` を使用
- [ ] `?connect_timeout=30` が含まれている

## ⚠️ よくある間違い

1. ❌ `aws-1` を使用している（正しくは `aws-0`）
2. ❌ 接続プーラーでポート `5432` を使用している（正しくは `6543`）
3. ❌ `connect_timeout` パラメータが含まれていない
4. ❌ パスワードに特殊文字が含まれている場合、URLエンコードされていない

## 🔍 トラブルシューティング

### エラーが続く場合

1. **Supabaseのデータベース状態を確認**
   - Supabaseダッシュボードでデータベースが **Active** になっているか確認

2. **接続プーラーが有効か確認**
   - Supabaseダッシュボードで **Settings** → **Database** → **Connection pooling** が有効になっているか確認

3. **直接接続URLに切り替える**
   - 接続プーラーが使用できない場合は、直接接続URL（オプションB）を使用

4. **パスワードを確認**
   - パスワードに特殊文字が含まれている場合、URLエンコードが必要です
   - 例: `@` → `%40`, `#` → `%23`

## 📞 サポート

問題が解決しない場合は、以下を確認してください：

1. Supabaseのデータベースログを確認
2. Vercelのビルドログとランタイムログを確認
3. エラーメッセージの全文をコピーして共有

---

**重要:** 環境変数を更新した後、必ずデプロイを再実行してください。

