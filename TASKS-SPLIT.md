# UGSオンラインスクール - 設定機能の実装タスク分割

## 📋 タスク分割方針

- **Claude Code**: バックエンドAPI実装（データベース操作、ビジネスロジック）
- **Cursor Composer**: データベーススキーマ変更、フロントエンドUI実装、統合テスト

---

## 🔵 Cursor Composerで実装するタスク

### タスク1: データベーススキーマの拡張（必須・最初に実施）

#### 1.1 Userモデルの拡張
`prisma/schema.prisma`の`User`モデルに以下のフィールドを追加：

```prisma
model User {
  // 既存フィールド...
  
  // プロフィール拡張フィールド
  phone              String?
  address            String?
  bio                String?
  attribute          String?
  gender             String?
  birthDate          DateTime?
  prefecture         String?
  profileImageUrl    String?
  notificationPreferences Json?
  lastLoginAt        DateTime?
  
  // 既存のリレーション...
  cancelRequests     CancelRequest[]  // 追加
}
```

#### 1.2 CancelRequestモデルの追加
`prisma/schema.prisma`に新しいモデルを追加：

```prisma
model CancelRequest {
  id                 String             @id @default(cuid())
  userId             String
  name               String
  email              String
  reason             String
  otherReason        String?
  continuationOption String
  status             CancelRequestStatus @default(PENDING)
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  user               User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("cancel_requests")
}

enum CancelRequestStatus {
  PENDING
  APPROVED
  REJECTED
  COMPLETED
}
```

#### 1.3 マイグレーション実行
```bash
npx prisma migrate dev --name add_user_profile_fields_and_cancel_request
npx prisma generate
```

**注意**: マイグレーション実行前に、既存データのバックアップを推奨

---

### タスク2: Supabase Storageバケットの作成（必須）

#### 2.1 バケット作成
- バケット名: `profile-images`
- 公開設定: 認証済みユーザーのみアクセス可能
- RLSポリシー: 自分の画像のみアクセス可能

**手動で実施**:
1. SupabaseダッシュボードでStorageに移動
2. 新しいバケット`profile-images`を作成
3. RLSポリシーを設定

---

### タスク3: プロフィール設定ページの更新（UI実装）

#### 3.1 画像アップロード機能の実装
`src/app/dashboard/settings/profile/page.tsx`を更新：

- localStorageの代わりに`/api/user/upload-profile-image`を使用
- 画像アップロード時にAPIを呼び出す
- アップロード成功後に`profileImageUrl`を更新
- エラーハンドリングの実装

#### 3.2 プロフィール情報の保存
- `/api/user/update-profile`を呼び出す
- 保存成功メッセージの表示
- エラーハンドリングの実装

---

### タスク4: セキュリティ設定ページの実装（UI実装）

#### 4.1 パスワード変更フォームの実装
`src/app/dashboard/settings/security/page.tsx`を更新：

- 現在のパスワード入力欄
- 新しいパスワード入力欄
- 確認用パスワード入力欄
- バリデーション（6文字以上、確認用パスワード一致）
- `/api/user/change-password`を呼び出す
- 成功・エラーメッセージの表示

---

### タスク5: 通知設定ページの更新（UI実装）

#### 5.1 API連携の実装
`src/app/dashboard/settings/notifications/page.tsx`を更新：

- ページ読み込み時に`/api/user/notification-settings`から設定を取得
- 設定変更時に`/api/user/notification-settings`にPUTリクエスト
- 保存成功メッセージの表示
- エラーハンドリングの実装

---

### タスク6: アカウント情報ページの更新（UI実装）

#### 6.1 実データの表示
`src/app/dashboard/settings/account/page.tsx`を更新：

- `user.createdAt`を表示（登録日）
- `user.lastLoginAt`を表示（最終ログイン日）
- 日付フォーマットの実装

---

### タスク7: ログイン時の最終ログイン日時更新

#### 7.1 ログイン処理の更新
`src/lib/auth/supabase-auth-service.ts`の`login`メソッドを更新：

- ログイン成功時に`lastLoginAt`を更新
- PrismaでUserモデルを更新

**実装箇所**: `login`メソッド内で、プロファイル取得後に追加

---

### タスク8: 統合テストと動作確認

#### 8.1 各機能の動作確認
1. プロフィール更新が正常に動作するか
2. プロフィール画像のアップロードが正常に動作するか
3. パスワード変更が正常に動作するか
4. 通知設定の保存・取得が正常に動作するか
5. 退会申請が正常に保存されるか
6. 認証チェックが適切に機能するか（他人のデータを更新できない）

#### 8.2 ビルド確認
```bash
npm run build
npm run lint
```

---

## 🤖 Claude Codeに実装を依頼するタスク

以下のAPIエンドポイントの実装をClaude Codeに依頼してください。

### API実装タスク1: プロフィール更新API
**ファイル**: `src/app/api/user/update-profile/route.ts`

**要件**:
- 認証チェック（`getAuthenticatedUser`を使用）
- 自分のプロフィールのみ更新可能
- PrismaでUserモデルを更新
- Supabase Authの`user_metadata.name`も更新
- プロフィール画像URLが含まれる場合は保存

**参考**: `TASKS-FOR-CLAUDE-CODE.md`の「タスク2」を参照

---

### API実装タスク2: プロフィール画像アップロードAPI
**ファイル**: `src/app/api/user/upload-profile-image/route.ts`（新規作成）

**要件**:
- 認証チェック
- ファイルサイズ制限（5MB）
- ファイルタイプチェック（画像のみ）
- Supabase Storageにアップロード
- 公開URLを生成
- Userモデルの`profileImageUrl`を更新

**参考**: `TASKS-FOR-CLAUDE-CODE.md`の「タスク3」を参照

---

### API実装タスク3: パスワード変更API
**ファイル**: `src/app/api/user/change-password/route.ts`（新規作成）

**要件**:
- 認証チェック
- 現在のパスワード確認
- 新しいパスワードのバリデーション（6文字以上）
- Supabase Authでパスワード更新

**参考**: `TASKS-FOR-CLAUDE-CODE.md`の「タスク4」を参照

---

### API実装タスク4: 通知設定API
**ファイル**: `src/app/api/user/notification-settings/route.ts`（新規作成）

**要件**:
- GET: 通知設定を取得
- PUT: 通知設定を更新
- 認証チェック
- Prismaで`notificationPreferences`を保存・取得

**参考**: `TASKS-FOR-CLAUDE-CODE.md`の「タスク5」を参照

---

### API実装タスク5: 退会申請APIの完全実装
**ファイル**: `src/app/api/user/cancel-request/route.ts`（既存ファイルを更新）

**要件**:
- 認証チェック
- CancelRequestモデルに保存
- バリデーション（必須項目チェック、その他の理由の文字数チェック）

**参考**: `TASKS-FOR-CLAUDE-CODE.md`の「タスク6」を参照

---

## 📝 実装順序の推奨

### Phase 1: データベース準備（Cursor）
1. ✅ データベーススキーマの拡張（タスク1）
2. ✅ マイグレーション実行（タスク1.3）
3. ✅ Supabase Storageバケット作成（タスク2）

### Phase 2: バックエンドAPI実装（Claude Code）
4. ✅ プロフィール更新API（API実装タスク1）
5. ✅ プロフィール画像アップロードAPI（API実装タスク2）
6. ✅ パスワード変更API（API実装タスク3）
7. ✅ 通知設定API（API実装タスク4）
8. ✅ 退会申請API（API実装タスク5）

### Phase 3: フロントエンド実装（Cursor）
9. ✅ プロフィール設定ページの更新（タスク3）
10. ✅ セキュリティ設定ページの実装（タスク4）
11. ✅ 通知設定ページの更新（タスク5）
12. ✅ アカウント情報ページの更新（タスク6）
13. ✅ ログイン時の最終ログイン日時更新（タスク7）

### Phase 4: テスト・確認（Cursor）
14. ✅ 統合テストと動作確認（タスク8）

---

## 🔗 参考ファイル

### 認証・ヘルパー
- `src/lib/auth/api-helpers.ts` - 認証ヘルパー関数
- `src/lib/auth/supabase-auth-service.ts` - 認証サービス

### データベース
- `prisma/schema.prisma` - Prismaスキーマ
- `src/lib/prisma.ts` - Prismaクライアント

### Supabase
- `src/lib/supabase.ts` - Supabaseクライアント

### 既存の設定ページ
- `src/app/dashboard/settings/profile/page.tsx` - プロフィール設定
- `src/app/dashboard/settings/notifications/page.tsx` - 通知設定
- `src/app/dashboard/settings/security/page.tsx` - セキュリティ設定
- `src/app/dashboard/settings/account/page.tsx` - アカウント設定

---

## 📌 Claude Codeへの指示文

Claude Codeには、`TASKS-FOR-CLAUDE-CODE.md`の以下のセクションを渡してください：

1. **タスク2: プロフィール更新APIの完全実装**
2. **タスク3: プロフィール画像アップロード機能**（API部分のみ）
3. **タスク4: パスワード変更機能**（API部分のみ）
4. **タスク5: 通知設定機能の完全実装**（API部分のみ）
5. **タスク6: 退会申請機能の完全実装**

---

## ⚠️ 注意事項

1. **データベーススキーマ変更は必ずCursorで実施**（マイグレーションの確認が容易）
2. **Supabase Storageバケットは手動で作成**（RLSポリシーの設定が必要）
3. **API実装後は必ずビルド確認**（`npm run build`）
4. **フロントエンド実装は段階的に**（1つずつ実装して動作確認）

---

**最終更新**: 2025年1月

