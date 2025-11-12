# 🚨 接続プールタイムアウトエラーの緊急対応

## 現在のエラー

```
Timed out fetching a new connection from the connection pool
(Current connection pool timeout: 10, connection limit: 5)
```

エラーログから、まだ古い設定（timeout: 10, limit: 5）が使われています。

## ✅ 緊急対応手順

### ステップ1: Vercelの環境変数を更新（必須）

1. [Vercelダッシュボード](https://vercel.com)にログイン
2. プロジェクト **ugs-online-school** を選択
3. **Settings** → **Environment Variables** に移動
4. `DATABASE_URL` を探して **Edit** をクリック
5. 現在の接続文字列を確認

**現在の接続文字列（例）:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?connect_timeout=30
```

**修正後の接続文字列:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?connect_timeout=30&connection_limit=10&pool_timeout=20
```

**重要:** 末尾に `&connection_limit=10&pool_timeout=20` を追加してください。

6. **すべての環境**（Production, Preview, Development）に適用されていることを確認
7. **Save** をクリック

### ステップ2: デプロイを再実行（必須）

1. **Deployments** タブに移動
2. 最新のデプロイメントを選択
3. 「**...**」メニュー → **Redeploy** をクリック
4. ビルドが成功するまで待つ（約2-3分）

### ステップ3: 動作確認

デプロイが完了したら、サイトにアクセスしてログインを試してください。

## 📋 確認ポイント

接続文字列に以下が含まれていることを確認：

- [ ] `connect_timeout=30`
- [ ] `connection_limit=10` ← **これが重要**
- [ ] `pool_timeout=20` ← **これが重要**
- [ ] すべての環境に適用されている
- [ ] デプロイを再実行した

## ⚠️ なぜ環境変数の更新が必要か

コード側で自動的にパラメータを追加するようにしましたが、Prismaクライアントはシングルトンとして作成されるため、環境変数の変更が反映されない場合があります。

**環境変数に直接追加することで、確実に設定が反映されます。**

## 🔍 接続文字列の例

**正しい形式:**
```
postgresql://postgres:[PASSWORD]@db.izyxfdmfqezpntbpjbnp.supabase.co:5432/postgres?connect_timeout=30&connection_limit=10&pool_timeout=20
```

**パラメータの説明:**
- `connect_timeout=30`: 接続タイムアウト（30秒）
- `connection_limit=10`: 接続プールの最大接続数（10に増加）
- `pool_timeout=20`: 接続プールのタイムアウト（20秒に増加）

---

**重要:** 環境変数を更新した後、**必ずデプロイを再実行**してください。

