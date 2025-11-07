# Supabase Storage バケット作成手順（簡易版）

## エラーが発生した場合

「Bucket not found」エラーが発生した場合は、以下の手順でバケットを作成してください。

## 手順

### 1. Supabaseダッシュボードにアクセス

1. https://supabase.com/dashboard にログイン
2. プロジェクトを選択

### 2. Storageバケットを作成

1. 左メニューから「**Storage**」をクリック
2. 「**Create a new bucket**」ボタンをクリック
3. 以下の設定を入力：

   ```
   Name: id-documents
   Public bucket: OFF（チェックを外す）
   File size limit: 10 MB
   Allowed MIME types: image/jpeg,image/png,image/jpg,application/pdf
   ```

4. 「**Create bucket**」をクリック

### 3. RLSポリシーの設定（重要）

バケット作成後、セキュリティのためRLSポリシーを設定します。

1. 作成した「**id-documents**」バケットをクリック
2. 「**Policies**」タブをクリック
3. 「**New Policy**」をクリック

#### ポリシー1: アップロード許可

- **Policy name**: `Allow authenticated users to upload`
- **Allowed operation**: `INSERT`
- **Policy definition**:
  ```sql
  (bucket_id = 'id-documents'::text)
  ```

#### ポリシー2: 読み取り許可（オプション）

- **Policy name**: `Allow authenticated users to read`
- **Allowed operation**: `SELECT`
- **Policy definition**:
  ```sql
  (bucket_id = 'id-documents'::text)
  ```

> **注意**: より厳密なセキュリティが必要な場合は、`README-SUPABASE-STORAGE.md`の詳細なポリシー設定を参照してください。

### 4. 動作確認

バケット作成後、再度アップロードを試してください。

## トラブルシューティング

### バケットが見つからないエラーが続く場合

1. バケット名が正確に `id-documents` であることを確認
2. プロジェクトが正しく選択されているか確認
3. 環境変数 `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されているか確認

### アップロード権限エラーが発生する場合

1. RLSポリシーが正しく設定されているか確認
2. Service Role Keyが正しく設定されているか確認

