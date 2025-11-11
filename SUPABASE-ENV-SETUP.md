# 🔴 緊急：Supabase環境変数の設定

## 問題の原因

エラーメッセージ `Error: supabaseKey is required.` から、Vercelの環境変数 `NEXT_PUBLIC_SUPABASE_ANON_KEY` が設定されていないことが原因です。

## ✅ 解決方法

### ステップ1: SupabaseでAPIキーを取得

1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. **Settings** → **API** に移動
4. **Project API keys** セクションを確認
5. **anon public** キーをコピー

### ステップ2: Vercelの環境変数を設定

以下の環境変数がすべて設定されているか確認してください：

1. [Vercelダッシュボード](https://vercel.com)にログイン
2. プロジェクト **ugs-online-school** を選択
3. **Settings** → **Environment Variables** に移動
4. 以下の環境変数を確認・設定：

#### 必須の環境変数：

1. **NEXT_PUBLIC_SUPABASE_URL**
   - 値: `https://izyxfdmfqezpntbpjbnp.supabase.co`
   - 形式: `https://[PROJECT-REF].supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY** ⚠️ これが設定されていない可能性が高い
   - 値: Supabaseダッシュボードで取得した **anon public** キー
   - 形式: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **SUPABASE_SERVICE_ROLE_KEY**
   - 値: Supabaseダッシュボードで取得した **service_role** キー
   - 形式: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

4. **DATABASE_URL**
   - 値: セッションプーラーの接続文字列（既に設定済み）

5. **DIRECT_URL**
   - 値: 直接接続の接続文字列

### ステップ3: 環境変数の設定方法

1. **Environment Variables** ページで、各環境変数を確認
2. 設定されていない場合は、**Add New** をクリック
3. **Key** に環境変数名を入力
4. **Value** に値を入力
5. **Environment** で **Production**, **Preview**, **Development** をすべて選択
6. **Save** をクリック

### ステップ4: デプロイを再実行

1. **Deployments** タブに移動
2. 最新のデプロイメントの **...** メニューから **Redeploy** を選択
3. デプロイが完了するまで待つ（通常1-2分）

## 📋 確認チェックリスト

- [ ] `NEXT_PUBLIC_SUPABASE_URL` が設定されている
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` が設定されている ⚠️ 重要
- [ ] `SUPABASE_SERVICE_ROLE_KEY` が設定されている
- [ ] `DATABASE_URL` が設定されている
- [ ] `DIRECT_URL` が設定されている
- [ ] すべての環境変数で **Production**, **Preview**, **Development** が選択されている
- [ ] デプロイを再実行した

## ⚠️ 重要な注意事項

- `NEXT_PUBLIC_` で始まる環境変数は、ブラウザ側でも使用されるため、公開されても問題ない値である必要があります
- `SUPABASE_SERVICE_ROLE_KEY` は機密情報なので、`NEXT_PUBLIC_` を付けないでください
- 環境変数を設定した後は、必ずデプロイを再実行してください

---

**最も可能性が高い原因は、`NEXT_PUBLIC_SUPABASE_ANON_KEY` が設定されていないことです。まずはこの環境変数を確認してください。**

