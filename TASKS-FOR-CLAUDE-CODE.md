# UGSオンラインスクール - 設定機能の完全実装タスク

## 概要
UGSオンラインスクールの設定関連機能（プロフィール更新、パスワード変更、通知設定、退会申請）を完全実装するためのタスクです。

## プロジェクト情報
- **フレームワーク**: Next.js 15 (App Router)
- **データベース**: PostgreSQL (Supabase) + Prisma ORM
- **認証**: Supabase Auth
- **ストレージ**: Supabase Storage
- **言語**: TypeScript

## 実装タスク

### タスク1: データベーススキーマの拡張

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

Userモデルにリレーションを追加：
```prisma
model User {
  // 既存フィールド...
  cancelRequests     CancelRequest[]
}
```

#### 1.3 マイグレーション実行
```bash
npx prisma migrate dev --name add_user_profile_fields_and_cancel_request
npx prisma generate
```

---

### タスク2: プロフィール更新APIの完全実装

#### 2.1 APIエンドポイントの実装
`src/app/api/user/update-profile/route.ts`を完全実装：

**要件**:
- 認証チェック（`getAuthenticatedUser`を使用）
- 自分のプロフィールのみ更新可能
- PrismaでUserモデルを更新
- Supabase Authの`user_metadata.name`も更新
- プロフィール画像URLが含まれる場合は保存

**実装例**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { 
      name, 
      phone, 
      address, 
      bio, 
      attribute, 
      gender, 
      birthDate, 
      prefecture, 
      profileImageUrl 
    } = body

    if (!name) {
      return NextResponse.json(
        { error: '名前は必須です' },
        { status: 400 }
      )
    }

    // Prismaでユーザーを更新
    const updatedUser = await prisma.user.update({
      where: { id: authUser!.id },
      data: {
        name,
        phone: phone || null,
        address: address || null,
        bio: bio || null,
        attribute: attribute || null,
        gender: gender || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        prefecture: prefecture || null,
        profileImageUrl: profileImageUrl || null,
      }
    })

    // Supabase Authのuser_metadataも更新
    await supabaseAdmin.auth.admin.updateUserById(authUser!.id, {
      user_metadata: {
        name,
        ...updatedUser
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })
  } catch (error) {
    console.error('プロフィール更新エラー:', error)
    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました' },
      { status: 500 }
    )
  }
}
```

---

### タスク3: プロフィール画像アップロード機能

#### 3.1 Supabase Storageバケットの確認・作成
- バケット名: `profile-images`
- 公開設定: 認証済みユーザーのみアクセス可能

#### 3.2 画像アップロードAPIの実装
`src/app/api/user/upload-profile-image/route.ts`を作成：

**要件**:
- 認証チェック
- ファイルサイズ制限（5MB）
- ファイルタイプチェック（画像のみ）
- Supabase Storageにアップロード
- 公開URLを生成
- Userモデルの`profileImageUrl`を更新

**実装例**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      )
    }

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは5MB以下にしてください' },
        { status: 400 }
      )
    }

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '画像ファイルを選択してください' },
        { status: 400 }
      )
    }

    // ファイル名を生成（userId-timestamp.extension）
    const fileExt = file.name.split('.').pop()
    const fileName = `${authUser!.id}-${Date.now()}.${fileExt}`

    // Supabase Storageにアップロード
    const { data, error } = await supabaseAdmin.storage
      .from('profile-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json(
        { error: '画像のアップロードに失敗しました' },
        { status: 500 }
      )
    }

    // 公開URLを取得
    const { data: urlData } = supabaseAdmin.storage
      .from('profile-images')
      .getPublicUrl(fileName)

    const imageUrl = urlData.publicUrl

    // Userモデルを更新
    await prisma.user.update({
      where: { id: authUser!.id },
      data: { profileImageUrl: imageUrl }
    })

    return NextResponse.json({
      success: true,
      imageUrl
    })
  } catch (error) {
    console.error('画像アップロードエラー:', error)
    return NextResponse.json(
      { error: '画像のアップロードに失敗しました' },
      { status: 500 }
    )
  }
}
```

#### 3.3 プロフィール設定ページの更新
`src/app/dashboard/settings/profile/page.tsx`を更新：

- localStorageの代わりにSupabase Storageを使用
- 画像アップロード時に`/api/user/upload-profile-image`を呼び出す
- アップロード成功後に`profileImageUrl`を更新

---

### タスク4: パスワード変更機能

#### 4.1 APIエンドポイントの実装
`src/app/api/user/change-password/route.ts`を作成：

**要件**:
- 認証チェック
- 現在のパスワード確認
- 新しいパスワードのバリデーション（6文字以上）
- Supabase Authでパスワード更新

**実装例**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '現在のパスワードと新しいパスワードを入力してください' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '新しいパスワードは6文字以上にしてください' },
        { status: 400 }
      )
    }

    // 現在のパスワードを確認（Supabase Authで再認証）
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: authUser!.email,
      password: currentPassword
    })

    if (signInError) {
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 401 }
      )
    }

    // パスワードを更新
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser!.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: 'パスワードの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'パスワードを更新しました'
    })
  } catch (error) {
    console.error('パスワード変更エラー:', error)
    return NextResponse.json(
      { error: 'パスワードの変更に失敗しました' },
      { status: 500 }
    )
  }
}
```

#### 4.2 セキュリティ設定ページの実装
`src/app/dashboard/settings/security/page.tsx`を更新：

- パスワード変更フォームを実装
- 現在のパスワード、新しいパスワード、確認用パスワードの入力欄
- バリデーション（6文字以上、確認用パスワード一致）
- `/api/user/change-password`を呼び出す

---

### タスク5: 通知設定機能の完全実装

#### 5.1 APIエンドポイントの実装
`src/app/api/user/notification-settings/route.ts`を作成：

**GET**: 通知設定を取得
**PUT**: 通知設定を更新

**実装例**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const user = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: { notificationPreferences: true }
    })

    const preferences = user?.notificationPreferences || {
      email: true,
      events: true,
      courses: false,
      promotions: true
    }

    return NextResponse.json({
      success: true,
      preferences
    })
  } catch (error) {
    console.error('通知設定取得エラー:', error)
    return NextResponse.json(
      { error: '通知設定の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { preferences } = body

    await prisma.user.update({
      where: { id: authUser!.id },
      data: {
        notificationPreferences: preferences
      }
    })

    return NextResponse.json({
      success: true,
      message: '通知設定を更新しました'
    })
  } catch (error) {
    console.error('通知設定更新エラー:', error)
    return NextResponse.json(
      { error: '通知設定の更新に失敗しました' },
      { status: 500 }
    )
  }
}
```

#### 5.2 通知設定ページの更新
`src/app/dashboard/settings/notifications/page.tsx`を更新：

- ページ読み込み時に`/api/user/notification-settings`から設定を取得
- 設定変更時に`/api/user/notification-settings`にPUTリクエスト
- 保存成功メッセージの表示

---

### タスク6: 退会申請機能の完全実装

#### 6.1 APIエンドポイントの実装
`src/app/api/user/cancel-request/route.ts`を完全実装：

**要件**:
- 認証チェック
- CancelRequestモデルに保存
- バリデーション（必須項目チェック）

**実装例**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { reason, otherReason, continuationOption } = body

    if (!reason || !continuationOption) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    // その他の理由のバリデーション
    if (reason === 'その他' && (!otherReason || otherReason.length < 200 || otherReason.length > 500)) {
      return NextResponse.json(
        { error: 'その他の理由は200文字以上500文字以下で入力してください' },
        { status: 400 }
      )
    }

    // 退会申請を保存
    await prisma.cancelRequest.create({
      data: {
        userId: authUser!.id,
        name: authUser!.name,
        email: authUser!.email,
        reason,
        otherReason: otherReason || null,
        continuationOption,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      message: '退会申請を受け付けました'
    })
  } catch (error) {
    console.error('退会申請エラー:', error)
    return NextResponse.json(
      { error: '退会申請の処理に失敗しました' },
      { status: 500 }
    )
  }
}
```

---

### タスク7: 最終ログイン日時の更新

#### 7.1 ログイン時の更新
`src/lib/auth/supabase-auth-service.ts`の`login`メソッドを更新：

- ログイン成功時に`lastLoginAt`を更新

**実装例**:
```typescript
// loginメソッド内で、プロファイル取得後
await prisma.user.update({
  where: { id: user.id },
  data: { lastLoginAt: new Date() }
})
```

#### 7.2 アカウント情報ページの更新
`src/app/dashboard/settings/account/page.tsx`を更新：

- `user.createdAt`を表示（登録日）
- `user.lastLoginAt`を表示（最終ログイン日）

---

## 実装時の注意事項

1. **認証チェック**: すべてのAPIエンドポイントで`getAuthenticatedUser`を使用
2. **エラーハンドリング**: 適切なエラーメッセージを日本語で返す
3. **バリデーション**: フロントエンドとバックエンドの両方で実装
4. **型安全性**: TypeScriptの型を適切に使用
5. **ログ**: 重要な操作はログに記録

## テスト項目

1. プロフィール更新が正常に動作するか
2. プロフィール画像のアップロードが正常に動作するか
3. パスワード変更が正常に動作するか
4. 通知設定の保存・取得が正常に動作するか
5. 退会申請が正常に保存されるか
6. 認証チェックが適切に機能するか（他人のデータを更新できない）

## 参考ファイル

- 認証ヘルパー: `src/lib/auth/api-helpers.ts`
- Prismaクライアント: `src/lib/prisma.ts`
- Supabaseクライアント: `src/lib/supabase.ts`
- 既存のプロフィール設定ページ: `src/app/dashboard/settings/profile/page.tsx`
- 既存の通知設定ページ: `src/app/dashboard/settings/notifications/page.tsx`
- 既存のセキュリティ設定ページ: `src/app/dashboard/settings/security/page.tsx`
- 既存のアカウント設定ページ: `src/app/dashboard/settings/account/page.tsx`

---

**実装完了後**: ビルドエラーがないか確認し、動作テストを実施してください。

