# 🎯 最終的な解決手順（シンプル版）

## 現在のエラー
```
FATAL: Tenant or user not found
```

## ✅ 解決方法（3ステップ）

### ステップ1: Supabaseで直接接続URLを取得（2分）

1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. **Settings** → **Database** に移動
3. **Connection string** セクションを開く
4. **「Direct connection」タブ**を選択（Transaction poolerではない）
5. **「URI」タブ**を選択
6. 接続文字列をコピー

**コピーした文字列の例:**
```
postgresql://postgres:[PASSWORD]@db.izyxfdmfqezpntbpjbnp.supabase.co:5432/postgres
```

### ステップ2: 接続文字列を修正（1分）

コピーした接続文字列の**末尾**に `?connect_timeout=30` を追加：

**修正後:**
```
postgresql://postgres:[PASSWORD]@db.izyxfdmfqezpntbpjbnp.supabase.co:5432/postgres?connect_timeout=30
```

### ステップ3: Vercelの環境変数を更新してデプロイ（3分）

1. [Vercelダッシュボード](https://vercel.com)にログイン
2. プロジェクト **ugs-online-school** を選択
3. **Settings** → **Environment Variables** に移動
4. `DATABASE_URL` を探して **Edit** をクリック
5. ステップ2で修正した接続文字列を**貼り付け**
6. **すべての環境**（Production, Preview, Development）に適用されていることを確認
7. **Save** をクリック
8. **Deployments** タブに移動
9. 最新のデプロイメントを選択
10. 「**...**」メニュー → **Redeploy** をクリック
11. ビルドが成功するまで待つ（約2-3分）

## ✅ 完了！

デプロイが完了したら、サイトにアクセスしてログインを試してください。
エラーが解消されているはずです。

---

**所要時間: 約6分**
**重要: Transaction poolerではなく、Direct connectionを使用してください**

