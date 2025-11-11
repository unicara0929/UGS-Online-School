# 🔧 「Tenant or user not found」エラーの解決方法

## 現在のエラー

```
FATAL: Tenant or user not found
```

## 問題の原因

Transaction poolerの接続文字列で、ユーザー名の形式（`postgres.[PROJECT-REF]`）が正しく認識されていない可能性があります。

## ✅ 解決方法: 直接接続URLに切り替える

### ステップ1: Supabaseで直接接続URLを取得

1. Supabaseダッシュボード → **Settings** → **Database**
2. **Connection string** セクションを開く
3. **Direct connection** タブを選択（Transaction poolerではない）
4. **URI** タブを選択
5. 接続文字列をコピー

**形式:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### ステップ2: 接続タイムアウトを追加

コピーした接続文字列の末尾に `?connect_timeout=30` を追加：

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?connect_timeout=30
```

### ステップ3: Vercelの環境変数を更新

1. Vercelダッシュボード → **Settings** → **Environment Variables**
2. `DATABASE_URL` を編集
3. 上記の直接接続URLを貼り付け
4. **すべての環境**（Production, Preview, Development）に適用されていることを確認
5. **Save** をクリック

### ステップ4: デプロイを再実行

1. Vercelダッシュボード → **Deployments**
2. 最新のデプロイメントを選択
3. 「**...**」メニュー → **Redeploy**
4. ビルドが成功するまで待つ

## 📋 確認ポイント

### ✅ 直接接続URLの形式
- [ ] `postgresql://postgres:` で始まる（`postgres.` ではない）
- [ ] `db.[PROJECT-REF].supabase.co` が含まれている
- [ ] ポートが `5432` である
- [ ] `?connect_timeout=30` が含まれている

### ❌ Transaction poolerの形式（現在使用中）
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
この形式は「Tenant or user not found」エラーを引き起こす可能性があります。

## 🔍 なぜ直接接続URLが推奨されるか

1. **シンプルな認証**: `postgres:[PASSWORD]` の形式で、ユーザー名の誤認識が起きにくい
2. **確実な接続**: 接続プーラー経由ではなく、直接データベースに接続
3. **エラーが少ない**: 「Tenant or user not found」エラーが発生しにくい

## ⚠️ 注意事項

- 直接接続URLは接続数の制限がありますが、Vercelのサーバーレス環境では問題になりにくいです
- 接続タイムアウト（`connect_timeout=30`）を設定することで、接続の安定性が向上します

---

**重要:** 直接接続URLに切り替えた後、必ずデプロイを再実行してください。

