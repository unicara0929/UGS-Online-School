# ストレージセットアップガイド

## 概要

このガイドでは、資料コンテンツ機能で使用するSupabase Storageのセットアップ方法を説明します。

## 初回セットアップ

### 自動セットアップ（推奨）

以下のコマンドを実行するだけで、Supabaseストレージバケットが自動的に作成されます：

```bash
npm run setup:storage
```

このスクリプトは以下を実行します：
- `materials` という名前のストレージバケットを作成
- 公開アクセスを有効化
- 最大ファイルサイズを50MBに設定
- 許可するファイルタイプを設定（PDF, Word, Excel, PowerPoint, 画像など）

### 手動セットアップ

自動セットアップが失敗した場合、またはより細かい設定をしたい場合は、以下の手順で手動セットアップできます：

1. **Supabase Dashboardにアクセス**
   - https://supabase.com にログイン
   - プロジェクトを選択

2. **ストレージバケットを作成**
   - 左側のメニューから「Storage」をクリック
   - 「Create a new bucket」をクリック
   - バケット名: `materials`
   - Public bucket: ✅ チェック
   - File size limit: `52428800` (50MB)
   - Allowed MIME types:
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/vnd.ms-excel`
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
     - `application/vnd.ms-powerpoint`
     - `application/vnd.openxmlformats-officedocument.presentationml.presentation`
     - `image/jpeg`
     - `image/png`
     - `image/gif`
     - `text/plain`
     - `application/zip`
   - 「Create bucket」をクリック

3. **確認**
   - `materials` バケットが作成されたことを確認
   - 公開アクセスが有効になっていることを確認

## アクセスポリシー（RLS）

Supabaseのストレージは、デフォルトでRow Level Security (RLS)が有効になっています。適切なアクセス制御を設定するために、以下のポリシーを推奨します：

### 推奨ポリシー

1. **読み取り（SELECT）**: すべてのユーザーに許可
   - 公開バケットなので、誰でもファイルをダウンロード可能

2. **アップロード（INSERT）**: 管理者のみに許可
   - 資料のアップロードは管理者のみが実行可能

3. **削除（DELETE）**: 管理者のみに許可
   - ファイルの削除も管理者のみが実行可能

### ポリシー設定方法

Supabase Dashboardでポリシーを設定する場合：

1. Storage > materials バケット > Policies をクリック
2. 「New policy」をクリック
3. 適切なポリシーを作成

**注意**: 現在の実装では、バックエンド（API）でサービスロールキーを使用してアップロード・削除を実行しているため、RLSポリシーは必須ではありません。ただし、セキュリティのベストプラクティスとして、ポリシーを設定することを推奨します。

## トラブルシューティング

### エラー: "Bucket not found"

**原因**: ストレージバケットが作成されていない

**解決方法**:
```bash
npm run setup:storage
```

### エラー: "Unauthorized"

**原因**: サービスロールキーが正しく設定されていない

**解決方法**:
1. `.env.local` ファイルを確認
2. `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されているか確認
3. Supabase Dashboardから正しいサービスロールキーをコピーして再設定

### エラー: "File size too large"

**原因**: ファイルサイズが50MBを超えている

**解決方法**:
- ファイルサイズを50MB以下に圧縮
- または、バケットの設定で最大ファイルサイズを増やす

### エラー: "Invalid file type"

**原因**: 許可されていないファイルタイプをアップロードしようとしている

**解決方法**:
- 許可されているファイルタイプを確認（PDF, Word, Excel, PowerPoint, 画像など）
- または、バケットの設定で許可するファイルタイプを追加

## 運用上の注意事項

### ストレージ容量

Supabaseの無料プランでは、ストレージ容量に制限があります（1GB）。大量のファイルをアップロードする場合は、以下を検討してください：

- 有料プランへのアップグレード
- 不要なファイルの定期的な削除
- ファイルサイズの最適化（圧縮など）

### バックアップ

重要なファイルは定期的にバックアップすることを推奨します。Supabaseのストレージは信頼性が高いですが、追加の安全策として：

- 定期的にファイルをローカルまたは別のストレージにバックアップ
- Supabaseの自動バックアップ機能を有効化（有料プラン）

### セキュリティ

- サービスロールキーは絶対に公開しない
- `.env.local` ファイルを `.gitignore` に追加（既に追加済み）
- 定期的にアクセスログを確認

## まとめ

Supabase Storageのセットアップは、以下のコマンド1つで完了します：

```bash
npm run setup:storage
```

これで、資料コンテンツ機能でファイルのアップロード・ダウンロードが可能になります。
