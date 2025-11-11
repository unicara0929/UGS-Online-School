# Supabase データベース接続設定ガイド

## 接続エラーが発生する場合の確認事項

### 1. 環境変数の確認

Vercelの環境変数設定で以下を確認してください：

#### 必須の環境変数：
- `DATABASE_URL`: Supabaseの接続プールURL（推奨）または直接接続URL
- `DIRECT_URL`: Supabaseの直接接続URL（マイグレーション用）

#### 接続プールURLの形式（推奨）：
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

または

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

#### 直接接続URLの形式：
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 2. Supabaseダッシュボードでの確認

1. **Supabaseダッシュボードにログイン**
2. **Settings > Database** に移動
3. **Connection Pooling** セクションを確認
4. **Connection string** をコピーして、Vercelの環境変数に設定

### 3. 接続プールの有効化

接続プールが無効になっている場合：
1. Supabaseダッシュボードで **Settings > Database** に移動
2. **Connection Pooling** を有効化
3. **Transaction mode** または **Session mode** を選択
4. 接続文字列をコピーして環境変数に設定

### 4. 接続プールが使用できない場合の対処

接続プールが使用できない場合は、直接接続URLを使用してください：

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

**注意**: 直接接続は接続数の制限があるため、本番環境では接続プールの使用を推奨します。

### 5. Vercelでの環境変数設定

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. **Settings > Environment Variables** に移動
4. 以下の環境変数を設定：
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 6. 接続エラーのトラブルシューティング

#### エラー: "Can't reach database server at pooler.supabase.com"

**原因**:
- 接続プールが無効になっている
- 環境変数が正しく設定されていない
- 接続プールのURLが間違っている

**対処法**:
1. Supabaseダッシュボードで接続プールの状態を確認
2. 接続文字列を再生成
3. Vercelの環境変数を更新
4. デプロイを再実行

#### エラー: "Connection timeout"

**原因**:
- データベースサーバーが応答していない
- ネットワークの問題

**対処法**:
1. Supabaseダッシュボードでデータベースの状態を確認
2. 接続プールの設定を確認
3. 直接接続URLに切り替えてテスト

### 7. 接続文字列の取得方法

1. Supabaseダッシュボードにログイン
2. **Settings > Database** に移動
3. **Connection string** セクションで以下を選択：
   - **URI**: 接続文字列をコピー
   - **Connection pooling**: 接続プール用のURLをコピー
4. パスワード部分 `[YOUR-PASSWORD]` を実際のパスワードに置き換え

### 8. 接続テスト

ローカル環境で接続をテストする場合：

```bash
# 環境変数を読み込んでPrisma Studioを起動
npx prisma studio

# または、直接接続をテスト
npx prisma db pull
```

### 9. よくある問題と解決策

#### 問題: 接続プールに接続できない
**解決策**: 直接接続URLに切り替える（一時的な対処）

#### 問題: 接続数が上限に達している
**解決策**: 
- 接続プールを使用する
- 不要な接続を閉じる
- Supabaseのプランをアップグレード

#### 問題: 環境変数が反映されない
**解決策**:
- Vercelで環境変数を再設定
- デプロイを再実行
- 環境変数の値にスペースや特殊文字が含まれていないか確認

---

**最終更新**: 2025年1月

