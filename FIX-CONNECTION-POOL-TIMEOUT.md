# 🔧 接続プールタイムアウトエラーの解決方法

## 現在のエラー

```
Timed out fetching a new connection from the connection pool
(Current connection pool timeout: 10, connection limit: 5)
```

## 問題の原因

Prismaクライアントの接続プールの接続数制限（5）に達している可能性があります。
Vercelのサーバーレス環境では、複数のリクエストが同時に処理されるため、接続数が不足することがあります。

## ✅ 解決方法

### 方法1: 接続文字列に接続プールパラメータを追加（推奨）

Vercelの環境変数 `DATABASE_URL` に以下のパラメータを追加：

**現在の接続文字列:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?connect_timeout=30
```

**修正後の接続文字列:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?connect_timeout=30&connection_limit=10&pool_timeout=20
```

**追加したパラメータ:**
- `connection_limit=10`: 接続プールの最大接続数を10に増やす（デフォルトは5）
- `pool_timeout=20`: 接続プールのタイムアウトを20秒に設定（デフォルトは10秒）

### 方法2: コード側で自動的にパラメータを追加（実装済み）

`src/lib/prisma.ts` を更新して、接続文字列に自動的にパラメータを追加するようにしました。
これにより、環境変数を更新しなくても接続プールの設定が改善されます。

## 📋 手順

### ステップ1: Vercelの環境変数を更新（推奨）

1. Vercelダッシュボード → **Settings** → **Environment Variables**
2. `DATABASE_URL` を編集
3. 接続文字列の末尾に `&connection_limit=10&pool_timeout=20` を追加
4. **Save** をクリック

**例:**
```
postgresql://postgres:[PASSWORD]@db.izyxfdmfqezpntbpjbnp.supabase.co:5432/postgres?connect_timeout=30&connection_limit=10&pool_timeout=20
```

### ステップ2: デプロイを再実行

1. Vercelダッシュボード → **Deployments**
2. 最新のデプロイメントを選択
3. 「**...**」メニュー → **Redeploy**
4. ビルドが成功するまで待つ

## 🔍 確認ポイント

- [ ] 接続文字列に `connection_limit=10` が含まれている
- [ ] 接続文字列に `pool_timeout=20` が含まれている
- [ ] 接続文字列に `connect_timeout=30` が含まれている
- [ ] デプロイを再実行した

## ⚠️ 注意事項

- 接続数の上限を増やすと、データベースへの負荷が増える可能性があります
- Supabaseの無料プランでは接続数の制限があるため、必要に応じてプランを確認してください
- コード側でも自動的にパラメータを追加するように実装したため、環境変数を更新しなくても改善される可能性があります

---

**重要:** 環境変数を更新した後、必ずデプロイを再実行してください。

