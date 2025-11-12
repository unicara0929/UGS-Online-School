# 🔍 接続プールエラーの最終確認と解決方法

## 現在の状況

エラーログから、まだ古い設定（`timeout: 10, limit: 5`）が使われています。
これは、Vercelの環境変数が更新されていないか、デプロイが再実行されていないことを示しています。

## ✅ 確認手順

### ステップ1: Vercelの環境変数を確認

1. [Vercelダッシュボード](https://vercel.com)にログイン
2. プロジェクト **ugs-online-school** を選択
3. **Settings** → **Environment Variables** に移動
4. `DATABASE_URL` を確認

**確認ポイント:**
- [ ] 接続文字列に `connection_limit=10` が含まれているか
- [ ] 接続文字列に `pool_timeout=20` が含まれているか
- [ ] すべての環境（Production, Preview, Development）に適用されているか

**正しい形式:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?connect_timeout=30&connection_limit=10&pool_timeout=20
```

### ステップ2: 環境変数が更新されていない場合

1. `DATABASE_URL` を **Edit** をクリック
2. 接続文字列の末尾に `&connection_limit=10&pool_timeout=20` を追加
3. **Save** をクリック

### ステップ3: デプロイを再実行（必須）

1. **Deployments** タブに移動
2. 最新のデプロイメントを選択
3. 「**...**」メニュー → **Redeploy** をクリック
4. ビルドが成功するまで待つ（約2-3分）

### ステップ4: デプロイ後の確認

デプロイが完了したら、再度ログインを試してください。
エラーログで `connection_limit: 10` と `pool_timeout: 20` が表示されれば成功です。

## 🔄 それでもエラーが続く場合

### オプション1: Transaction poolerを再試行

直接接続URLで接続数の制限に達している可能性があります。
Transaction poolerを使用することで、接続数の制限を回避できます。

1. Supabaseダッシュボード → **Settings** → **Database**
2. **Connection string** → **Connection pooling** タブ
3. **Transaction pooler** を選択
4. **Shared Pooler** ボタンをクリック
5. 接続文字列をコピー
6. `aws-1` を `aws-0` に変更
7. 末尾に `&connect_timeout=30&connection_limit=10&pool_timeout=20` を追加
8. Vercelの環境変数 `DATABASE_URL` を更新
9. デプロイを再実行

### オプション2: Supabaseの接続設定を確認

1. Supabaseダッシュボードでデータベースの状態を確認
2. 接続数の制限を確認（無料プランでは制限がある可能性）
3. 必要に応じてプランをアップグレード

## 📋 チェックリスト

- [ ] Vercelの環境変数 `DATABASE_URL` に `connection_limit=10` が含まれている
- [ ] Vercelの環境変数 `DATABASE_URL` に `pool_timeout=20` が含まれている
- [ ] すべての環境（Production, Preview, Development）に適用されている
- [ ] デプロイを再実行した
- [ ] デプロイが成功した
- [ ] エラーログで新しい設定が反映されているか確認

---

**重要:** 環境変数を更新した後、**必ずデプロイを再実行**してください。
デプロイが完了するまで、古い設定が使われ続けます。

