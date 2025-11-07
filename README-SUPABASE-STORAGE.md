# Supabase Storage セットアップガイド

## 1. Supabase Storageバケットの作成

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左メニューから「Storage」を選択
4. 「Create a new bucket」をクリック
5. 以下の設定でバケットを作成：
   - **Name**: `id-documents`
   - **Public bucket**: `OFF`（非公開に設定）
   - **File size limit**: `10 MB`（必要に応じて調整）
   - **Allowed MIME types**: `image/jpeg,image/png,image/jpg,application/pdf`

## 2. RLS（Row Level Security）ポリシーの設定

### 2.1 アップロードポリシー

Storageの「Policies」タブで、以下のポリシーを作成：

**Policy Name**: `Allow authenticated users to upload their own documents`

**Policy Definition**:
```sql
-- 認証済みユーザーが自分のフォルダにのみアップロード可能
(
  bucket_id = 'id-documents'::text
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
```

**Allowed operations**: `INSERT`

### 2.2 読み取りポリシー

**Policy Name**: `Allow users to read their own documents`

**Policy Definition**:
```sql
-- 認証済みユーザーが自分のファイルのみ読み取り可能
(
  bucket_id = 'id-documents'::text
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
```

**Allowed operations**: `SELECT`

### 2.3 管理者用ポリシー（オプション）

管理者がすべてのファイルにアクセスできるようにする場合：

**Policy Name**: `Allow admins to access all documents`

**Policy Definition**:
```sql
-- 管理者ロールのユーザーがすべてのファイルにアクセス可能
(
  bucket_id = 'id-documents'::text
  AND EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
)
```

**Allowed operations**: `SELECT, INSERT, UPDATE, DELETE`

## 3. ファイル構造

アップロードされたファイルは以下の構造で保存されます：

```
id-documents/
  └── {userId}/
      └── {timestamp}_{filename}
```

例：
```
id-documents/
  └── ae299c6a-9787-43ea-a438-8576d07112c7/
      └── 1699344000000_drivers_license.jpg
```

## 4. セキュリティのベストプラクティス

1. **バケットを非公開に設定**: パブリックアクセスを無効化
2. **RLSポリシーを設定**: ユーザーが自分のファイルのみアクセス可能にする
3. **ファイルサイズ制限**: 10MB以下に制限
4. **MIMEタイプ制限**: JPEG、PNG、PDFのみ許可
5. **署名付きURLを使用**: 一時的なアクセスを提供（1時間有効）

## 5. トラブルシューティング

### バケットが見つからないエラー

- Supabaseダッシュボードでバケットが作成されているか確認
- バケット名が `id-documents` であることを確認

### アップロード権限エラー

- RLSポリシーが正しく設定されているか確認
- ユーザーが認証されているか確認

### ファイルURLが取得できない

- 署名付きURLの生成に失敗している可能性
- Service Role Keyが正しく設定されているか確認

## 6. 環境変数

以下の環境変数が設定されていることを確認：

```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
```

## 7. テスト方法

1. 身分証アップロード機能をテスト
2. SupabaseダッシュボードのStorageでファイルが正しく保存されているか確認
3. 他のユーザーでログインして、自分のファイルにのみアクセスできることを確認

