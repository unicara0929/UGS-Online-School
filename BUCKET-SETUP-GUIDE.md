# Supabase Storage バケット作成ガイド（詳細版）

## ⚠️ 現在のエラー

「Bucket not found」エラーが発生しています。以下の手順でバケットを作成してください。

## 📋 手順

### ステップ1: Supabaseダッシュボードにアクセス

1. ブラウザで https://supabase.com/dashboard を開く
2. ログイン（まだの場合）
3. **ugs-online-school** プロジェクトを選択

### ステップ2: Storageページを開く

1. 左側のメニューから「**Storage**」をクリック
2. 「**Create a new bucket**」ボタンをクリック

### ステップ3: バケットを作成

以下の設定を入力してください：

| 項目 | 設定値 |
|------|--------|
| **Name** | `id-documents` |
| **Public bucket** | `OFF`（チェックを外す） |
| **File size limit** | `10` MB |
| **Allowed MIME types** | `image/jpeg,image/png,image/jpg,application/pdf` |

入力後、「**Create bucket**」をクリック

### ステップ4: RLSポリシーを設定（重要）

バケット作成後、セキュリティのためRLSポリシーを設定します。

#### 4.1 バケットのPoliciesページを開く

1. 作成した「**id-documents**」バケットをクリック
2. 「**Policies**」タブをクリック
3. 「**New Policy**」ボタンをクリック

#### 4.2 アップロードポリシーを作成

1. **Policy name**: `Allow authenticated users to upload`
2. **Allowed operation**: `INSERT` を選択
3. **Policy definition**: 以下のSQLを入力

```sql
(bucket_id = 'id-documents'::text)
```

4. 「**Review**」をクリック
5. 「**Save policy**」をクリック

#### 4.3 読み取りポリシーを作成（オプション）

1. 「**New Policy**」ボタンを再度クリック
2. **Policy name**: `Allow authenticated users to read`
3. **Allowed operation**: `SELECT` を選択
4. **Policy definition**: 以下のSQLを入力

```sql
(bucket_id = 'id-documents'::text)
```

5. 「**Review**」をクリック
6. 「**Save policy**」をクリック

### ステップ5: 動作確認

1. ブラウザでサイトに戻る
2. ログインする
3. 「昇格管理」ページを開く
4. 身分証アップロードを再度試す

## 🔍 確認ポイント

- [ ] バケット名が正確に `id-documents` である
- [ ] バケットが非公開（Public bucket: OFF）である
- [ ] RLSポリシーが設定されている
- [ ] 環境変数 `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されている

## ❓ よくある質問

### Q: バケットを作成したのにエラーが出る

A: 以下の点を確認してください：
- バケット名が `id-documents` と完全に一致しているか
- Vercelの環境変数が正しく設定されているか
- デプロイが完了しているか

### Q: RLSポリシーは必須ですか？

A: はい、セキュリティのため必須です。ポリシーを設定しないと、アップロードや読み取りができない場合があります。

### Q: バケットを削除してしまった

A: 同じ手順で再度作成してください。データは失われますが、バケット自体は再作成可能です。

