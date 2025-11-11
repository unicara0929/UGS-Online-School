# データベース接続エラーの追加確認事項

## ✅ 進捗状況

環境変数は直接接続URLに変更されました：
- ✅ 接続プールURL → 直接接続URLに変更済み
- ✅ URL形式は正しい: `db.izyxfdmfqezpntbpjbnp.supabase.co:5432`

しかし、まだ接続できていません。

## 🔍 確認すべき事項

### 1. Supabaseのデータベース状態を確認

1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. **Settings** → **Database** に移動
4. **Database status** を確認
   - データベースが **Active** になっているか確認
   - もし **Paused** や **Inactive** の場合は、**Resume** をクリック

### 2. Supabaseのファイアウォール設定を確認

1. Supabaseダッシュボードで **Settings** → **Database** に移動
2. **Connection pooling** セクションを確認
3. **Network restrictions** または **IP allowlist** を確認
   - Vercelからの接続がブロックされていないか確認
   - 必要に応じて、**Allow all IPs** を有効化

### 3. 接続文字列のパスワードを確認

1. Supabaseダッシュボードで **Settings** → **Database** に移動
2. **Connection string** セクションを開く
3. **URI** タブを選択
4. 接続文字列をコピー
5. Vercelの環境変数 `DATABASE_URL` と比較
   - パスワード部分が一致しているか確認
   - URLエンコードが必要な場合は、特殊文字をエンコード

### 4. Supabaseのログを確認

1. Supabaseダッシュボードで **Logs** → **Postgres Logs** に移動
2. 接続試行のログを確認
   - 認証エラーが出ていないか確認
   - 接続拒否の理由を確認

### 5. Vercelの環境変数を再確認

1. Vercelダッシュボードで **Settings** → **Environment Variables** に移動
2. `DATABASE_URL` の値を確認
   - 直接接続URLになっているか確認
   - パスワード部分が正しいか確認
   - 余分なスペースや改行が入っていないか確認

## 🔧 トラブルシューティング

### パスワードに特殊文字が含まれている場合

パスワードに特殊文字（`@`, `:`, `/`, `%` など）が含まれている場合、URLエンコードが必要です：

- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `%` → `%25`

### Supabaseのデータベースが一時停止している場合

無料プランの場合、一定期間アクセスがないとデータベースが一時停止することがあります：

1. Supabaseダッシュボードでプロジェクトを開く
2. データベースが停止している場合は、**Resume** をクリック
3. 数分待ってから再度接続を試す

### 接続数の上限に達している場合

直接接続は接続数の制限があります：

1. Supabaseダッシュボードで **Settings** → **Database** に移動
2. **Connection pooling** セクションを確認
3. 接続プールを有効化して、接続プールURLを使用することを検討

## 📞 サポートに問い合わせる場合

上記の確認を行っても解決しない場合は、以下をSupabaseサポートに問い合わせてください：

1. プロジェクトID: `izyxfdmfqezpntbpjbnp`
2. エラーメッセージ: `Can't reach database server at db.izyxfdmfqezpntbpjbnp.supabase.co:5432`
3. 接続元: Vercel（サーバーレス環境）
4. 接続文字列の形式: 直接接続URL（URIタブ）

---

**最終更新**: 2025年1月

