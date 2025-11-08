# バケット名の問題と解決方法

## ⚠️ 現在の問題

バケット名にスペースが含まれている場合、Supabase Storageで問題が発生する可能性があります。

## 🔍 バケット名の確認方法

1. Supabaseダッシュボードにアクセス
2. Storage → バケット一覧を確認
3. バケット名を正確に確認（大文字小文字、スペースの有無）

## ✅ 推奨される解決方法

### 方法1: バケット名を変更（推奨）

1. Supabaseダッシュボードでバケットを削除
2. 新しいバケットを作成：
   - **Name**: `ugs-id-documents`（スペースなし、小文字）
   - **Public bucket**: `OFF`
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: `image/jpeg,image/png,image/jpg,application/pdf`

3. Vercelの環境変数を設定：
   - **Name**: `SUPABASE_STORAGE_BUCKET_NAME`
   - **Value**: `ugs-id-documents`

4. RLSポリシーを更新：
   ```sql
   (bucket_id = 'ugs-id-documents'::text)
   ```

### 方法2: 現在のバケット名を使用

現在のバケット名 `UGS up load` を使用する場合：

1. Vercelの環境変数を設定：
   - **Name**: `SUPABASE_STORAGE_BUCKET_NAME`
   - **Value**: `UGS up load`（正確に同じ名前）

2. RLSポリシーを確認：
   ```sql
   (bucket_id = 'UGS up load'::text)
   ```

## 🚨 注意点

- バケット名は大文字小文字を区別します
- バケット名にスペースが含まれる場合、問題が発生する可能性があります
- バケット名は変更できないため、削除して再作成する必要があります

## 📝 次のステップ

1. バケット名を確認
2. バケット名をスペースなしに変更（推奨）
3. Vercelの環境変数を設定
4. 再度アップロードを試す

