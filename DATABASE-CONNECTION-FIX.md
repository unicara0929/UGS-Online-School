# データベース接続エラーの緊急対処法

## 問題の症状
- `Can't reach database server at aws-1-ap-northeast-1.pooler.supabase.com:5432`
- データベース接続エラーが頻繁に発生

## 緊急対処：直接接続URLに切り替え

### 1. Supabaseダッシュボードで直接接続URLを取得

1. Supabaseダッシュボードにログイン
2. **Settings > Database** に移動
3. **Connection string** セクションで **URI** を選択
4. 接続文字列をコピー（例：`postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`）

### 2. Vercelの環境変数を更新

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. **Settings > Environment Variables** に移動
4. `DATABASE_URL` を以下の形式に更新：

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

**重要**: `[YOUR-PASSWORD]` と `[PROJECT-REF]` を実際の値に置き換えてください。

### 3. デプロイを再実行

環境変数を更新後、Vercelでデプロイを再実行してください。

## 接続プールが使用できない理由

接続プールが使用できない場合の一般的な原因：
1. **接続プールが無効になっている**: Supabaseの設定で接続プールが無効になっている
2. **接続数の上限**: 接続プールの接続数が上限に達している
3. **URLの形式が間違っている**: 接続プール用のURLの形式が正しくない
4. **一時的な問題**: Supabase側の一時的な問題

## 接続プールを再度有効にする方法

1. Supabaseダッシュボードで **Settings > Database** に移動
2. **Connection Pooling** セクションを確認
3. 接続プールが無効になっている場合は、有効化
4. **Connection pooling** の接続文字列をコピー
5. Vercelの環境変数 `DATABASE_URL` を更新

## 注意事項

- **直接接続は接続数の制限があるため、本番環境では接続プールの使用を推奨します**
- 直接接続は一時的な対処として使用し、接続プールの問題が解決したら再度切り替えることを推奨します
- 接続プールが使用できない場合は、Supabaseのサポートに問い合わせることを検討してください

---

**最終更新**: 2025年1月

