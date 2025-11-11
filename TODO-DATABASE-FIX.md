# ✅ データベース接続エラー解決のための作業チェックリスト

## 🎯 目標
Vercelの環境変数 `DATABASE_URL` を正しい形式に更新し、データベース接続エラーを解決する

## 📋 作業手順

### ステップ1: Supabaseで接続文字列を取得（5分）

1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. **Settings** → **Database** に移動
4. **Connection string** セクションを開く

#### 方法A: 接続プーラーを使用（推奨）
   - **Connection pooling** タブを選択
   - **Session mode** を選択
   - 接続文字列をコピー
   - 形式: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
   - 末尾に `&connect_timeout=30` を追加

#### 方法B: 直接接続を使用（接続プーラーが使えない場合）
   - **URI** タブを選択
   - 接続文字列をコピー
   - 形式: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - 末尾に `?connect_timeout=30` を追加

### ステップ2: Vercelの環境変数を更新（5分）

1. [Vercelダッシュボード](https://vercel.com)にログイン
2. プロジェクト **ugs-online-school** を選択
3. **Settings** → **Environment Variables** に移動
4. `DATABASE_URL` を探す
5. **Edit** をクリック
6. ステップ1で取得した接続文字列を貼り付け
7. **すべての環境**（Production, Preview, Development）に適用されていることを確認
8. **Save** をクリック

### ステップ3: デプロイを再実行（5分）

1. Vercelダッシュボードで **Deployments** タブに移動
2. 最新のデプロイメントを選択
3. 右上の「**...**」メニューをクリック
4. **Redeploy** を選択
5. ビルドが成功するまで待つ（約2-3分）

### ステップ4: 動作確認（5分）

1. デプロイが完了したら、サイトにアクセス
2. ログインを試す
3. ブラウザのコンソール（F12）でエラーを確認
4. データベース接続エラーが解消されているか確認

## ⚠️ 重要な確認ポイント

### ✅ 接続プーラーを使用する場合
- [ ] URLに `aws-0` が含まれている（`aws-1` ではない）
- [ ] ポートが `6543` である
- [ ] `?pgbouncer=true&connect_timeout=30` が含まれている

### ✅ 直接接続を使用する場合
- [ ] URLが `db.[PROJECT-REF].supabase.co` で始まる
- [ ] ポートが `5432` である
- [ ] `?connect_timeout=30` が含まれている

### ✅ 共通確認事項
- [ ] パスワードが正しく設定されている
- [ ] すべての環境（Production, Preview, Development）に適用されている
- [ ] デプロイを再実行した

## 🔍 トラブルシューティング

### エラーが続く場合

1. **接続プーラーが使用できない場合**
   - 直接接続URL（方法B）に切り替える

2. **パスワードに特殊文字が含まれている場合**
   - URLエンコードが必要です
   - 例: `@` → `%40`, `#` → `%23`, `&` → `%26`

3. **接続タイムアウトが発生する場合**
   - `connect_timeout=30` を `connect_timeout=60` に増やす

4. **Supabaseのデータベースが停止している場合**
   - Supabaseダッシュボードでデータベースの状態を確認

## 📞 次のステップ

作業が完了したら：
1. ログインが正常に動作するか確認
2. エラーが解消されたか確認
3. 問題が続く場合は、エラーメッセージの全文を共有

---

**所要時間: 約20分**
**優先度: 🔴 高（アプリケーションが使用できない状態）**

