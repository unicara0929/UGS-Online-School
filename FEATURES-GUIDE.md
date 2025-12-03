# UGSオンラインスクール 機能ガイド（実装版）

> **最終更新:** 2025-12-01
> **バージョン:** 2.0（実装ベース）
> **注意:** このドキュメントは実際の実装に基づいて作成されています

このドキュメントでは、UGSオンラインスクールに**実際に実装されている**すべての機能とその使い方を説明します。

---

## 📋 目次

1. [認証・ユーザー管理](#1-認証ユーザー管理)
2. [会員番号機能](#2-会員番号機能)
3. [教育コンテンツ機能](#3-教育コンテンツ機能)
4. [資料コンテンツ機能](#4-資料コンテンツ機能)
5. [イベント管理機能](#5-イベント管理機能)
6. [通知機能](#6-通知機能)
7. [報酬管理機能](#7-報酬管理機能)
8. [紹介管理機能](#8-紹介管理機能)
9. [昇格申請機能](#9-昇格申請機能)
10. [LP面談機能](#10-lp面談機能)
11. [契約管理機能](#11-契約管理機能)
12. [基礎テスト・アンケート](#12-基礎テストアンケート)
13. [コンプライアンステスト](#13-コンプライアンステスト)
14. [事前アンケート機能](#14-事前アンケート機能)
15. [個別相談機能](#15-個別相談機能)
16. [FAQ・お問い合わせ](#16-faqお問い合わせ)
17. [名刺注文機能](#17-名刺注文機能)
18. [チーム管理機能](#18-チーム管理機能)
19. [サブスクリプション管理](#19-サブスクリプション管理)
20. [プロフィール・アカウント設定](#20-プロフィールアカウント設定)
21. [管理者機能](#21-管理者機能)

---

## 1. 認証・ユーザー管理

### 概要
Supabase Authを使用した堅牢な認証システム。4つのロールによる段階的な権限管理を実装。

### ロール体系

| ロール | 権限 | 説明 |
|--------|------|------|
| **MEMBER** | 基本 | UGS会員（一般会員） |
| **FP** | 拡張 | FPエイド（独立系FP） |
| **MANAGER** | 上級 | マネージャー |
| **ADMIN** | 全権限 | 管理者 |

### 会員ステータス

```
PENDING      仮登録（決済未完了）
  ↓ 決済完了
ACTIVE       有効会員
  ↓ 決済失敗
PAST_DUE     支払い遅延
  ↓ 猶予期間経過
DELINQUENT   長期滞納
  ↓ ユーザー退会申請
CANCELED     退会済み
  ↓ 運営判断
TERMINATED   強制解約
EXPIRED      期限切れ
```

### 会員登録フロー

1. **仮登録** (`/register`)
   - 名前・メールアドレス・パスワード入力
   - 紹介コード入力（オプション）
   - PendingUserテーブルに保存

2. **メール認証**
   - 認証リンク送信
   - トークン検証（24時間有効）

3. **Supabaseユーザー作成**
   - メール認証完了後、自動作成
   - パスワードハッシュ化

4. **決済** (`/checkout`)
   - Stripe決済ページに遷移
   - サブスクリプション登録

5. **本登録完了**
   - Stripe Webhook受信
   - Userレコード作成
   - 会員番号自動付与
   - 紹介レコード作成（紹介経由の場合）

### APIエンドポイント

#### ユーザー向け
- `POST /api/auth/create-profile` - プロフィール作成
- `POST /api/auth/reset-password` - パスワードリセット
- `GET /api/auth/profile/[userId]` - プロフィール取得
- `PUT /api/user/update-profile` - プロフィール更新
- `POST /api/user/change-password` - パスワード変更

#### 管理者向け
- `GET /api/admin/users` - ユーザー一覧
- `GET /api/admin/users/[userId]` - ユーザー詳細
- `PUT /api/admin/users/[userId]` - ユーザー更新
- `POST /api/admin/users/role` - ロール変更
- `POST /api/admin/users/bulk-membership-status` - 一括ステータス変更
- `GET /api/admin/users/export` - CSVエクスポート

### データベースモデル

```prisma
model User {
  id                      String       @id @default(cuid())
  email                   String       @unique
  name                    String
  role                    UserRole     @default(MEMBER)
  memberId                String?      @unique
  referralCode            String?      @unique
  membershipStatus        MembershipStatus @default(ACTIVE)
  // プロフィール拡張
  phone                   String?
  address                 String?
  bio                     String?
  profileImageUrl         String?
  // ... 30以上のリレーション
}

model PendingUser {
  id                String   @id
  email             String   @unique
  name              String
  password          String   // ハッシュ化済み
  emailVerified     Boolean  @default(false)
  verificationToken String?  @unique
  tokenExpiresAt    DateTime?
}
```

---

## 2. 会員番号機能

### 概要
全ユーザーに一意の会員番号を自動付与。問い合わせ時の本人確認などに使用。

### 会員番号フォーマット
```
UGS + 7桁の連番
例: UGS0000001, UGS0000123, UGS9999999
```

### 生成タイミング

1. **新規ユーザー登録時**
   - Stripe Webhook受信後、Userレコード作成時に自動生成
   - トランザクション内で連番を取得（レースコンディション対策済み）

2. **既存ユーザーへの一括付与**
   - スクリプト実行: `npx tsx scripts/assign-member-ids.ts`
   - 登録日時順に連番を割り当て

### 表示箇所

- **ユーザープロフィール** (`/dashboard/settings/profile`)
  - 読み取り専用フィールドとして表示
  - 「問い合わせ時にこの番号をお伝えください」と案内

- **管理者ユーザー一覧** (`/dashboard/admin/users`)
  - モノスペースフォントで見やすく表示
  - 会員番号で検索可能

### 検索機能

管理者画面のユーザー検索で、以下の項目を検索可能:
- 名前
- メールアドレス
- **会員番号** ← NEW

### APIエンドポイント

会員番号は User モデルの一部として取得されます。

### 実装詳細

```typescript
// src/lib/services/member-id-generator.ts
export async function generateMemberId(): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    // 最新の会員番号を取得
    const latestUser = await tx.user.findFirst({
      where: { memberId: { startsWith: 'UGS' } },
      orderBy: { memberId: 'desc' },
      select: { memberId: true }
    })

    let nextNumber = 1
    if (latestUser?.memberId) {
      const numberPart = latestUser.memberId.replace('UGS', '')
      nextNumber = parseInt(numberPart, 10) + 1
    }

    const paddedNumber = nextNumber.toString().padStart(7, '0')
    return `UGS${paddedNumber}`
  })
}
```

### データベースモデル

```prisma
model User {
  memberId String? @unique  // UGS0000001形式
  // 注: 現在nullable、将来的に必須化予定
}
```

---

## 3. 教育コンテンツ機能

### 概要
段階的に学習できるコース体系。Vimeo動画プレイヤーで視聴し、進捗を自動管理。

### コース体系

#### カテゴリー
- **BASIC（基礎編）**: 収入を得るための基礎知識
- **PRACTICAL（実践編）**: ライフスタイル向上の実践知識
- **ADVANCED（応用編）**: 起業・独立を目指す高度な内容

#### レベル
- **BEGINNER（初級）**: 初心者向け
- **INTERMEDIATE（中級）**: 経験者向け
- **ADVANCED（上級）**: 上級者向け

### アクセス権限

- **一般公開**: すべてのロールがアクセス可能
- **FPエイド限定**: `isLocked: true` のコースはFP以上のみ

### 機能詳細

#### コース一覧 (`/dashboard/courses`)

表示内容:
- カテゴリー別グルーピング
- コースカード（タイトル、説明、レベル、進捗率）
- ロック状態の表示
- 「学習を始める」ボタン

#### レッスン視聴 (`/dashboard/learn/[courseId]`)

機能:
- Vimeo動画プレイヤー
- レッスン一覧（サイドバー）
- 視聴進捗の自動保存
- 90%以上視聴で自動完了
- 次のレッスンへの自動遷移
- コース全体の進捗率表示

#### 進捗管理

- レッスンごとの視聴位置を記録
- 動画の90%以上を視聴したら完了
- コース完了率を計算（完了レッスン数 ÷ 総レッスン数）
- 最終視聴日時を記録

### APIエンドポイント

#### ユーザー向け
- `GET /api/courses` - コース一覧と進捗を取得
- `GET /api/courses/[courseId]` - 特定のコースとレッスンを取得
- `POST /api/courses/progress` - レッスンの進捗を更新

#### 管理者向け
- `GET /api/admin/courses` - コース一覧
- `POST /api/admin/courses` - コース作成
- `PUT /api/admin/courses/[courseId]` - コース更新
- `DELETE /api/admin/courses/[courseId]` - コース削除
- `POST /api/admin/courses/[courseId]/lessons` - レッスン作成
- `PUT /api/admin/lessons/[lessonId]` - レッスン更新
- `DELETE /api/admin/lessons/[lessonId]` - レッスン削除

### データベースモデル

```prisma
model Course {
  id          String         @id
  title       String
  description String?
  category    CourseCategory // BASIC/PRACTICAL/ADVANCED
  level       CourseLevel    // BEGINNER/INTERMEDIATE/ADVANCED
  isLocked    Boolean        @default(false)
  isPublished Boolean        @default(true)
  order       Int            @default(0)
}

model Lesson {
  id          String  @id
  courseId    String
  title       String
  description String?
  duration    Int
  order       Int
  videoUrl    String?  // Vimeo URL
  pdfUrl      String?
  isPublished Boolean  @default(true)
}

model CourseProgress {
  id             String    @id
  userId         String
  courseId       String
  lessonId       String?
  isCompleted    Boolean   @default(false)
  completedAt    DateTime?
  currentTime    Int?      // 動画視聴位置（秒）
  videoDuration  Int?
  lastWatchedAt  DateTime?

  @@unique([userId, courseId, lessonId])
}
```

---

## 4. 資料コンテンツ機能

### 概要
PDFやマニュアルなどの資料をダウンロード可能。ロール別に閲覧権限を設定。

### アクセス権限

資料ごとに閲覧可能ロールを設定:
- `allowedRoles: ['ADMIN']` - 管理者のみ
- `allowedRoles: ['MANAGER', 'ADMIN']` - マネージャー以上
- `allowedRoles: ['FP', 'MANAGER', 'ADMIN']` - FPエイド以上
- `allowedRoles: ['MEMBER', 'FP', 'MANAGER', 'ADMIN']` - 全員

### 機能詳細

#### 資料一覧 (`/dashboard/materials`)

表示内容:
- 資料カード（タイトル、説明、カテゴリー）
- ファイル形式とサイズ
- ダウンロードボタン
- カテゴリー別フィルター

#### 資料管理（管理者）

管理画面 (`/dashboard/admin/materials`):
- 資料一覧
- 新規追加
- 編集・削除
- 閲覧可能ロール設定
- ファイルアップロード（Supabase Storage）

### 資料の種類

- **マニュアル**: UGSオンラインスクールの使い方、FPエイド活動マニュアル
- **制度説明**: 紹介制度、報酬制度の説明資料
- **テンプレート**: 昇格申請書類テンプレート
- **その他**: 各種参考資料

### APIエンドポイント

#### ユーザー向け
- `GET /api/materials` - アクセス可能な資料一覧
- `GET /api/materials/[materialId]` - 資料詳細

#### 管理者向け
- `GET /api/admin/materials` - すべての資料一覧
- `POST /api/admin/materials` - 資料作成
- `PUT /api/admin/materials/[materialId]` - 資料更新
- `DELETE /api/admin/materials/[materialId]` - 資料削除
- `POST /api/admin/materials/upload` - ファイルアップロード

### データベースモデル

```prisma
model Material {
  id           String     @id
  title        String
  description  String?
  category     String?
  fileUrl      String
  fileType     String
  fileSize     Int
  allowedRoles UserRole[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}
```

---

## 5. イベント管理機能

### 概要
オンライン/オフライン/ハイブリッド形式のイベントを管理。有料イベント対応、出席確認機能を実装。

### イベント形式

- **ONLINE**: オンラインのみ（Zoom等）
- **OFFLINE**: オフラインのみ（会場開催）
- **HYBRID**: ハイブリッド（両方）

### 参加設定

- **REQUIRED（必須）**: 対象ロールは参加必須
- **OPTIONAL（任意）**: 自由参加

### 対象ロール

- **MEMBER**: UGS会員のみ
- **FP**: FPエイドのみ
- **MANAGER**: マネージャーのみ
- **ALL**: 全員

### 機能詳細

#### イベント一覧 (`/dashboard/events`)

**実装状況:**
- ✅ イベントカード表示
- ✅ 日時・場所・対象ロール表示
- ✅ 参加登録ボタン
- ✅ 参加済み表示
- ✅ 有料イベントの価格表示
- ❌ **イベント詳細ページへのリンク（未実装）**

**表示される情報:**
- タイトル
- 日時
- 場所（オンライン/オフライン）
- 参加人数 / 定員
- 参加ステータス（未登録/登録済み/出席完了）
- 有料イベントの価格

#### イベント詳細ページ

**⚠️ 重要な問題点:**
ユーザー向けのイベント詳細ページ (`/dashboard/events/[eventId]`) が**実装されていません**。

現状:
- イベント一覧でカード表示のみ
- クリックして詳細を見ることができない
- 通知からのリンクも一覧ページに遷移

影響:
- イベントの詳細説明を確認できない
- 過去イベントの写真・資料を閲覧できない
- ユーザー体験に重大な影響

→ **高優先度で実装が必要**（後述の修正で対応）

#### イベント作成・管理（管理者）

管理画面 (`/dashboard/admin/events`):
- イベント作成
- 基本情報設定（タイトル、日時、場所）
- 対象ロール選択（複数可）
- 参加設定（必須/任意）
- 開催形式（オンライン/オフライン/ハイブリッド）
- 有料イベント設定（価格、Stripe連携）
- サムネイル画像アップロード
- 参加者一覧表示
- 一括メール送信

#### 有料イベント

機能:
- Stripe連携で決済処理
- 決済完了後に参加確定
- 決済ステータス管理（PENDING/PAID/REFUNDED）
- キャンセル・返金機能

#### 出席確認システム

2つの方法で出席を確認:

**方法1: 参加コード入力**
- 用途: オフラインイベント、ライブ参加者
- 流れ:
  1. 管理者が参加コードを設定（アルファベット）
  2. イベント当日、会場で参加コードを告知
  3. 参加者がコード入力
  4. 自動的に出席完了

**方法2: 録画視聴+アンケート**
- 用途: 後日視聴者
- 流れ:
  1. 管理者がVimeo録画URLとアンケートURLを設定
  2. 参加者が録画を視聴
  3. 「視聴完了」ボタンをクリック
  4. アンケートに回答
  5. 両方完了で出席完了

#### 定期開催イベント

機能:
- 月次自動生成（Cron Job）
- パターン設定（例: 毎月第1日曜日）
- `/api/cron/generate-monthly-events` で自動実行

#### 過去イベント記録（アーカイブ）

管理者が記録できる内容:
- 実施内容の概要
- 当日の写真（複数アップロード）
- セミナー資料リンク
- 実参加人数
- 最終的な会場情報
- 管理者メモ

記録専用モード:
- `isArchiveOnly: true` で記録のみ（参加募集なし）

### APIエンドポイント

#### ユーザー向け
- `GET /api/events` - イベント一覧（ロール別フィルタリング済み）
- `POST /api/events/register` - 参加登録
- `POST /api/events/cancel` - キャンセル
- `POST /api/events/checkout` - 有料イベント決済
- `POST /api/events/verify-payment` - 決済確認
- `POST /api/events/submit-attendance-code` - 参加コード提出
- `POST /api/events/mark-video-watched` - 録画視聴完了
- `POST /api/events/mark-survey-completed` - アンケート完了

#### 管理者向け
- `GET /api/admin/events` - イベント一覧
- `POST /api/admin/events` - イベント作成
- `PUT /api/admin/events/[eventId]` - イベント更新
- `DELETE /api/admin/events/[eventId]` - イベント削除
- `GET /api/admin/events/[eventId]/participants` - 参加者一覧
- `POST /api/admin/events/[eventId]/send-email` - メール送信
- `POST /api/admin/events/generate-recurring` - 定期イベント生成
- `POST /api/admin/events/upload-thumbnail` - サムネイルアップロード
- `POST /api/admin/events/upload-photo` - 写真アップロード（過去イベント）

### データベースモデル

```prisma
model Event {
  id              String              @id
  title           String
  description     String?
  date            DateTime
  time            String?
  targetRoles     EventTargetRole[]
  attendanceType  EventAttendanceType
  venueType       EventVenueType
  location        String?
  maxParticipants Int?
  status          EventStatus
  thumbnailUrl    String?
  // 有料イベント
  isPaid          Boolean             @default(false)
  price           Int?
  stripePriceId   String?
  // 出席確認
  attendanceCode  String?
  vimeoUrl        String?
  surveyUrl       String?
  attendanceDeadline DateTime?
  // 定期開催
  isRecurring     Boolean             @default(false)
  recurrencePattern String?
  // アーカイブ
  summary         String?
  photos          String[]
  materialsUrl    String?
  actualParticipants Int?
  adminNotes      String?
  isArchiveOnly   Boolean             @default(false)
}

model EventRegistration {
  id                     String              @id
  userId                 String
  eventId                String
  paymentStatus          EventPaymentStatus
  attendanceMethod       AttendanceMethod?
  attendanceCompletedAt  DateTime?
  videoWatched           Boolean             @default(false)
  surveyCompleted        Boolean             @default(false)

  @@unique([userId, eventId])
}
```

---

## 6. 通知機能

### 概要
多層的な通知システムで重要情報を確実に伝達。個別通知とシステム通知の2種類。

### 通知の種類

#### 個別通知（Notificationテーブル）

ユーザー個人に送られる通知（14種類）:

**昇格関連:**
- `PROMOTION_ELIGIBLE` - 昇格条件達成
- `PROMOTION_APPROVED` - 昇格承認
- `PROMOTION_REJECTED` - 昇格却下

**報酬関連:**
- `COMPENSATION_READY` - 報酬確定
- `COMPENSATION_PAID` - 報酬支払い完了

**イベント関連:**
- `EVENT_REMINDER` - イベントリマインダー
- `EVENT_REQUIRED` - 必須イベント通知

**その他:**
- `CONTRACT_ACHIEVED` - 契約達成
- `REFERRAL_REWARDED` - 紹介報酬
- `ACTION_REQUIRED` - アクション必要
- `LP_MEETING_REQUESTED` - LP面談リクエスト
- `LP_MEETING_SCHEDULED` - LP面談スケジュール確定
- `LP_MEETING_COMPLETED` - LP面談完了
- `LP_MEETING_REMINDER` - LP面談リマインダー

#### システム通知（SystemNotificationテーブル）

全体またはロール別に配信される通知:

- `EVENT_ADDED` - 新しいイベント追加
- `MATERIAL_ADDED` - 新しい資料追加
- `COURSE_ADDED` - 新しいコース追加
- `LESSON_ADDED` - 新しいレッスン追加

### 優先度

- **CRITICAL**: 重要（赤色表示）
- **INFO**: 情報（青色表示）
- **SUCCESS**: 成功（緑色表示）

### 機能詳細

#### 通知バー（ダッシュボード上部）

実装場所: `src/components/NotificationBar.tsx`

機能:
- 最新の未読システム通知を1件表示
- NEWバッジ表示
- クリックで詳細ページに遷移
- 閉じるボタンで既読化

**現在の遷移先:**
- イベント通知: `/dashboard/events`（一覧ページ）
- ※イベント詳細ページが未実装のため

#### 通知一覧 (`/dashboard/notifications`)

表示内容:
- 未読通知セクション
- 既読通知セクション
- 優先度別アイコン・色分け
- アクションURLへのリンク
- 個別既読ボタン
- 「すべて既読にする」ボタン

#### 新着バッジ機能

カテゴリごとに新着コンテンツを表示:

**対象カテゴリ:**
- `EVENTS` - イベント
- `COURSES` - コース
- `MATERIALS` - 資料
- `NOTIFICATIONS` - 通知

**仕組み:**
- `UserCategoryView` テーブルで最終閲覧日時を記録
- 最終閲覧以降に追加されたコンテンツにNEWバッジ表示
- ページを開くと自動的に閲覧済みとしてマーク

### ロールフィルタリング

システム通知は対象ロールを指定可能:

```typescript
// イベント作成時の通知
targetRoles: ['MEMBER']  // UGS会員のみ
targetRoles: ['FP', 'MANAGER']  // FPエイド・マネージャー
targetRoles: []  // 全員向け（空配列）
```

**実装状況:**
- ✅ ロールフィルタリングロジック実装済み
- ✅ デバッグログ追加（検証用）
- ⚠️ 実際の動作は本番環境で要確認

### APIエンドポイント

#### ユーザー向け
- `GET /api/notifications` - 通知一覧
- `GET /api/notifications/latest` - 最新の未読通知
- `POST /api/notifications/[id]/read` - 個別既読
- `POST /api/notifications/mark-all-read` - 全て既読
- `GET /api/new-badge/status` - 新着バッジ状況
- `POST /api/new-badge/mark-viewed` - カテゴリ閲覧記録

### データベースモデル

```prisma
model Notification {
  id        String               @id
  userId    String
  type      NotificationType
  priority  NotificationPriority
  title     String
  message   String
  actionUrl String?
  isRead    Boolean              @default(false)
  readAt    DateTime?
  createdAt DateTime             @default(now())
}

model SystemNotification {
  id          String                  @id
  type        SystemNotificationType
  title       String
  contentType ContentType?
  contentId   String?
  targetUrl   String?
  targetRoles UserRole[]
  isActive    Boolean                 @default(true)
  createdAt   DateTime                @default(now())
}

model UserNotificationRead {
  id             String   @id
  userId         String
  notificationId String
  readAt         DateTime @default(now())

  @@unique([userId, notificationId])
}

model UserCategoryView {
  id         String      @id
  userId     String
  category   ContentType
  lastViewed DateTime    @default(now())

  @@unique([userId, category])
}
```

---

## 7. 報酬管理機能

### 概要
透明性の高い報酬計算・管理システム。CSV一括アップロード対応。

### 報酬計算ロジック

現在の実装:
```typescript
interface CompensationBreakdown {
  memberReferral: number  // UGS会員紹介報酬（現在無効化）
  fpReferral: number      // FPエイド紹介報酬（現在無効化）
  contract: number        // 契約報酬（主要）
  bonus: number           // ボーナス
  deduction: number       // 控除
}
```

**注意:**
- 紹介報酬機能は実装されていますが、現在無効化されています
- 契約報酬が主な収入源

### 報酬フロー

```
1. CSV一括アップロード（契約データ）
   ↓
2. 自動報酬計算（PENDING）
   ↓
3. 管理者確認・承認（CONFIRMED）
   ↓
4. 支払い完了（PAID）
   ↓
5. ユーザーに通知
```

### 機能詳細

#### 報酬一覧 (`/dashboard/compensation`)

表示内容:
- 月別報酬一覧
- 報酬額
- 内訳（契約報酬、ボーナス、控除）
- ステータス（PENDING/CONFIRMED/PAID）
- 詳細ボタン

#### 報酬管理（管理者） (`/dashboard/admin/compensations`)

機能:
- 報酬一覧（全ユーザー）
- 月次報酬自動生成
- CSV一括アップロード
- 個別承認
- 一括支払い完了
- フィルター（ステータス、月、ユーザー）

#### CSV一括アップロード

手順:
1. CSVファイル選択
2. プレビュー表示（エラーチェック）
3. 確定ボタン
4. 契約データ登録
5. 報酬自動計算

CSVフォーマット:
```csv
ユーザーID,契約番号,商品名,契約日,金額
```

#### 口座情報管理

ユーザーが登録可能:
- 銀行名
- 支店名・支店番号
- 口座種別（普通/当座/貯蓄）
- 口座番号
- 口座名義

**ゆうちょ銀行特別対応:**
- 記号・番号入力
- 自動的に店番・口座番号に変換

### 昇格条件との連携

マネージャー昇格条件:
- **直近6ヶ月平均**: 70,000円以上

計算方法:
```typescript
const recentCompensations = await prisma.compensation.findMany({
  where: {
    userId,
    status: 'PAID',
    month: { gte: sixMonthsAgo }
  }
})

const avgCompensation = sum(compensations) / 6
```

### APIエンドポイント

#### ユーザー向け
- `GET /api/compensations` - 報酬一覧
- `POST /api/user/bank-account` - 口座情報登録

#### 管理者向け
- `GET /api/admin/compensations` - 全ユーザーの報酬一覧
- `POST /api/admin/compensations/generate` - 月次報酬生成
- `POST /api/admin/compensations/[compensationId]/approve` - 承認
- `POST /api/admin/compensations/[compensationId]/pay` - 支払い完了
- `POST /api/admin/compensations/upload/preview` - CSVプレビュー
- `POST /api/admin/compensations/upload/confirm` - CSV確定

### データベースモデル

```prisma
model Compensation {
  id            String             @id
  userId        String
  month         String             // YYYY-MM形式
  amount        Int
  breakdown     Json               // 報酬内訳
  contractCount Int                @default(0)
  earnedAsRole  UserRole           @default(FP)
  status        CompensationStatus
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  @@unique([userId, month])
}

model BankAccount {
  id                String      @id
  userId            String      @unique
  bankName          String
  branchName        String?
  branchNumber      String?
  accountType       AccountType
  accountNumber     String
  accountHolderName String
  // ゆうちょ専用
  isYuchoBank       Boolean     @default(false)
  yuchoSymbol       String?
  yuchoNumber       String?
}

model Contract {
  id             String         @id
  userId         String
  contractNumber String         @unique
  productName    String?
  contractType   ContractType
  status         ContractStatus
  signedAt       DateTime
  amount         Int?
  rewardAmount   Int?
}
```

---

## 8. 紹介管理機能

### 概要
紹介ネットワークの追跡システム。紹介コードを使用したリンク発行形式。

### 紹介コード

各ユーザーに自動生成:
- フォーマット: 8文字のランダム英数字
- 例: `AB12CD34`, `XY98ZW76`
- ユニーク制約で重複なし

### 紹介フロー

```
1. 紹介者が紹介コード取得
   ↓
2. 紹介リンク作成: /register?ref={紹介コード}
   ↓
3. 新規ユーザーが紹介リンク経由で登録
   ↓
4. Stripe決済完了
   ↓
5. Webhook処理で紹介レコード自動作成
```

### 紹介タイプ

登録時点のロールで自動判定:
- **MEMBER**: UGS会員紹介
- **FP**: FPエイド紹介

### 機能詳細

#### 紹介ダッシュボード (`/dashboard/referrals`)

表示内容:
- 自分の紹介コード
- 紹介リンク（コピーボタン付き）
- 紹介実績:
  - UGS会員紹介数
  - FPエイド紹介数
  - 承認待ち数
- 紹介一覧テーブル

#### 紹介管理（管理者） (`/dashboard/admin/referrals`)

機能:
- 全紹介レコード一覧
- 承認/却下
- 報酬支払い管理
- フィルター（ステータス、紹介者、紹介タイプ）

### 昇格条件との連携

マネージャー昇格条件:
- **UGS会員紹介**: 8名以上
- **FPエイド紹介**: 4名以上
- **期間**: 直近6ヶ月

計算方法:
```typescript
const recentReferrals = await prisma.referral.findMany({
  where: {
    referrerId,
    status: 'APPROVED',
    createdAt: { gte: sixMonthsAgo }
  }
})

const memberCount = recentReferrals.filter(r => r.referralType === 'MEMBER').length
const fpCount = recentReferrals.filter(r => r.referralType === 'FP').length
```

### 紹介報酬

**注意:** 現在、紹介報酬機能は無効化されています。

実装はされていますが、報酬計算時に除外:
```typescript
breakdown: {
  memberReferral: 0,  // 無効化
  fpReferral: 0,      // 無効化
  contract: amount,   // メイン
  bonus: 0,
  deduction: 0
}
```

### APIエンドポイント

#### ユーザー向け
- `GET /api/referrals` - 自分の紹介一覧
- `GET /api/user/referral-code` - 紹介コード取得
- `GET /api/user/referral-stats` - 紹介統計

#### 管理者向け
- `GET /api/admin/referrals` - 全紹介一覧
- `POST /api/admin/referrals/[referralId]/approve` - 承認
- `POST /api/admin/referrals/[referralId]/reject` - 却下

### データベースモデル

```prisma
model Referral {
  id           String         @id
  referrerId   String         // 紹介者
  referredId   String         // 被紹介者
  referralType ReferralType   // MEMBER/FP
  status       ReferralStatus // PENDING/APPROVED/REJECTED/REWARDED
  rewardAmount Int?
  rewardPaidAt DateTime?
  createdAt    DateTime       @default(now())
}

model User {
  referralCode String? @unique  // 8文字の紹介コード
}
```

---

## 9. 昇格申請機能

### 概要
2段階の昇格システム。条件を満たすと申請可能。

### 昇格ルート

```
MEMBER（UGS会員）
  ↓ LP面談・基礎テスト・アンケート
FP（FPエイド）
  ↓ 報酬・紹介・契約実績
MANAGER（マネージャー）
```

### 会員 → FPエイド昇格

#### 申請前条件（すべて必須）

1. **LP面談完了**
   - `/dashboard/lp-meeting/request` でリクエスト
   - FPとの面談を実施
   - 完了すると `lpMeetingCompleted: true`

2. **基礎テスト合格**
   - `/dashboard/basic-test` で受験
   - 合格点: 80%以上（設定可能）
   - 合格すると `basicTestCompleted: true`

3. **アンケート提出**
   - `/dashboard/survey` で回答
   - 提出すると `surveyCompleted: true`

#### 申請フロー

条件を満たすと `/dashboard/promotion` に「FP昇格申請」ボタンが表示:

1. **ワンクリック申請**
   - `status: FP_REVIEW`
   - 管理者に通知

2. **管理者承認**
   - `/dashboard/admin/promotions/fp` で確認
   - 承認 or 却下（理由入力）

3. **承認後の手続き（すべて必須）**
   - 業務委託契約書への同意
   - 身分証アップロード
   - **コンプライアンステスト合格**（90%以上）← NEW
   - FPオンボーディング動画視聴（90%以上）

4. **ロール変更**
   - すべて完了で `role: FP` に昇格
   - FPエイド機能が解放

#### コンプライアンステスト

FPエイド昇格に必須のテスト（詳細は[13. コンプライアンステスト](#13-コンプライアンステスト)を参照）:
- 合格ライン: 90%以上
- 何度でも再受験可能
- 不合格時は解説表示
- 合格後にガイダンス動画視聴可能

#### FPオンボーディング

専用ページ (`/dashboard/fp-onboarding`):
- 動画ガイダンス（Vimeo）
- 視聴進捗追跡
- 90%以上視聴で完了
- 完了すると FPエイドダッシュボードにアクセス可能
- **コンプライアンステスト合格が前提条件**

### FPエイド → マネージャー昇格

#### 昇格条件（すべて必須）

自動判定される3つの条件:

1. **報酬実績**
   - 直近6ヶ月平均: 70,000円以上
   - PAID ステータスの報酬のみカウント

2. **紹介実績**
   - UGS会員紹介: 8名以上
   - FPエイド紹介: 4名以上
   - APPROVED ステータスのみカウント
   - 直近6ヶ月

3. **契約実績**
   - 直20被保達成
   - （詳細な計算ロジックは実装済み）

#### 申請フロー

条件を満たすと自動的に申請可能:

1. **申請**
   - `/dashboard/promotion` で「マネージャー昇格申請」
   - `status: PENDING`

2. **管理者承認**
   - `/dashboard/admin/promotions/manager` で確認
   - 承認 or 却下（理由入力）

3. **ロール変更**
   - 承認されると `role: MANAGER` に昇格
   - マネージャー機能が解放

### 申請履歴

`/dashboard/promotion` で確認可能:
- 申請日時
- ステータス（審査中/承認/却下）
- 却下理由（該当する場合）

### APIエンドポイント

#### ユーザー向け
- `GET /api/promotions/eligibility` - 昇格条件チェック
- `POST /api/promotions/apply` - 昇格申請
- `GET /api/promotions/history` - 申請履歴
- `GET /api/user/fp-promotion-status` - FP昇格ステータス
- `POST /api/user/fp-promotion-apply` - FP昇格申請
- `POST /api/user/fp-onboarding/complete` - オンボーディング完了

#### 管理者向け
- `GET /api/admin/promotions/fp` - FP昇格申請一覧
- `POST /api/admin/promotions/fp/[applicationId]/approve` - FP昇格承認
- `POST /api/admin/promotions/fp/[applicationId]/reject` - FP昇格却下
- `GET /api/admin/promotions/manager` - マネージャー昇格申請一覧
- `POST /api/admin/promotions/manager/[applicationId]/approve` - マネージャー昇格承認
- `POST /api/admin/promotions/manager/[applicationId]/reject` - マネージャー昇格却下

### データベースモデル

```prisma
model FPPromotionApplication {
  id                    String                          @id
  userId                String
  status                FPPromotionApplicationStatus
  lpMeetingCompleted    Boolean                         @default(false)
  basicTestCompleted    Boolean                         @default(false)
  surveyCompleted       Boolean                         @default(false)
  idDocumentUrl         String?
  contractAgreed        Boolean                         @default(false)
  promotionEmailSent    Boolean                         @default(false)
  appliedAt             DateTime                        @default(now())
  approvedAt            DateTime?
  rejectedAt            DateTime?
  rejectionReason       String?
}

model PromotionApplication {
  id              String          @id
  userId          String
  targetRole      UserRole
  status          PromotionStatus
  appliedAt       DateTime        @default(now())
  approvedAt      DateTime?
  rejectedAt      DateTime?
  rejectionReason String?
  reviewedBy      String?
  reviewNotes     String?
}

model User {
  fpOnboardingCompleted   Boolean   @default(true)
  fpOnboardingCompletedAt DateTime?
}
```

---

## 10. LP面談機能

### 概要
UGS会員とFPエイドのマッチング・面談予約システム。FP昇格の必須条件。

### 面談の目的

- UGS会員が FPエイド昇格前に実施
- FPエイドとの1対1面談
- 活動内容の説明、質疑応答

### 機能詳細

#### 面談リクエスト（会員側） (`/dashboard/lp-meeting/request`)

入力内容:
- **希望日時**: 5つまで選択可能
- **面談場所**:
  - オンライン（Zoom/Google Meet/Teams）
  - オフライン（UGS本社）
- **メモ**: 質問事項など

制約:
- 1会員につき1面談のみリクエスト可能
- 既にリクエスト済みの場合は再リクエスト不可

#### 面談管理（FP側） (`/dashboard/lp-meeting/manage`)

表示内容:
- 自分に割り当てられた面談一覧
- ステータス（REQUESTED/SCHEDULED/COMPLETED）
- 会員情報
- 希望日時
- メモ

機能:
- 日程調整
- 面談URL設定（オンラインの場合）
- 面談完了報告

#### 面談管理（管理者） (`/dashboard/admin/lp-meetings`)

機能:
- 全面談リクエスト一覧
- FPへのアサイン
- ステータス管理
- 完了確認

### 面談ステータス

```
REQUESTED    リクエスト受付
  ↓ 管理者がFPアサイン
SCHEDULED    スケジュール確定
  ↓ 面談実施
COMPLETED    面談完了
CANCELLED    キャンセル
NO_SHOW      ノーショー（無断欠席）← NEW
```

### 再申請機能

**重要な変更:** 以前は1会員につき1面談のみでしたが、現在は以下の条件で再申請可能:

- **再申請可能なケース:**
  - 面談完了（COMPLETED）後に再度申請
  - キャンセル（CANCELLED）された場合
  - ノーショー（NO_SHOW）になった場合

- **再申請不可なケース:**
  - 既にアクティブな面談（REQUESTED または SCHEDULED）がある場合

これにより、MEMBERからFPへの昇格後に降格された場合でも、再度LP面談を受けることが可能になりました。

### 昇格条件との連携

面談完了すると:
- `lpMeetingCompleted: true`
- FP昇格申請条件の1つを満たす

### APIエンドポイント

#### ユーザー向け
- `POST /api/lp-meetings/request` - 面談リクエスト
- `GET /api/lp-meetings/my-scheduled` - 自分の予定
- `POST /api/lp-meetings/[meetingId]/complete` - 面談完了

#### 管理者向け
- `GET /api/admin/lp-meetings` - 面談一覧
- `POST /api/admin/lp-meetings/[meetingId]/schedule` - スケジュール設定

### データベースモデル

```prisma
model LPMeeting {
  id              String           @id
  memberId        String           // 複数面談可能に変更（uniqueを削除）
  fpId            String?
  counselorName   String?          // FP以外の担当者名（手動入力）← NEW
  status          LPMeetingStatus  // REQUESTED/SCHEDULED/COMPLETED/CANCELLED/NO_SHOW
  preferredDates  Json             // 希望日時5つ
  meetingLocation MeetingLocation  // OFFLINE/UGS_OFFICE
  scheduledAt     DateTime?
  completedAt     DateTime?
  cancelledAt     DateTime?        // キャンセル日時← NEW
  meetingUrl      String?
  meetingPlatform MeetingPlatform? // ZOOM/GOOGLE_MEET/TEAMS
  notes           String?
  memberNotes     String?
  assignedBy      String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  // 事前アンケート関連
  preInterviewResponses PreInterviewResponse[]
}
```

**重要な変更点:**
- `memberId` の `@unique` 制約を削除 → 再申請可能に
- `NO_SHOW` ステータスを追加
- `counselorName` フィールドを追加（FP以外の担当者対応）
- `cancelledAt` フィールドを追加
- `preInterviewResponses` リレーションを追加

---

## 11. 契約管理機能

### 概要
契約実績の記録・管理。報酬計算と昇格条件に使用。

### 機能詳細

#### 契約登録（管理者）

方法:
- **CSV一括アップロード** (推奨)
- 個別登録

CSVフォーマット:
```csv
ユーザーID,契約番号,商品名,契約日,金額
```

#### 契約一覧 (`/dashboard/contracts`)

表示内容:
- 契約番号
- 商品名
- 契約日
- 金額
- ステータス（ACTIVE/CANCELLED/EXPIRED）

### 昇格条件との連携

マネージャー昇格条件:
- **直20被保達成**

計算ロジック:
- 直近の契約実績から判定
- （詳細なロジックは実装済み）

### APIエンドポイント

#### ユーザー向け
- `GET /api/contracts` - 契約一覧
- `GET /api/contracts/[contractId]` - 契約詳細

#### 管理者向け
- `POST /api/admin/contracts/upload/preview` - CSVプレビュー
- `POST /api/admin/contracts/upload/confirm` - CSV確定

### データベースモデル

```prisma
model Contract {
  id             String         @id
  userId         String
  contractNumber String         @unique
  productName    String?
  contractType   ContractType   // INSURANCE/OTHER
  status         ContractStatus
  signedAt       DateTime
  amount         Int?
  rewardAmount   Int?
  createdAt      DateTime       @default(now())
}
```

---

## 12. 基礎テスト・アンケート

### 概要
FP昇格の必須条件。管理者が作成・管理。

### 基礎テスト

#### テスト受験 (`/dashboard/basic-test`)

機能:
- 問題表示（選択式・記述式）
- 回答送信
- 即座に採点
- 合格/不合格判定
- 結果表示

合格条件:
- 80%以上（管理者が設定可能）

#### テスト管理（管理者） (`/dashboard/admin/basic-test`)

機能:
- テスト作成
- 問題追加・編集
- 合格点設定
- 受験結果一覧

### アンケート

#### アンケート回答 (`/dashboard/survey`)

機能:
- 質問表示
- 回答入力（選択式・記述式）
- 送信

#### アンケート管理（管理者） (`/dashboard/admin/survey`)

機能:
- アンケート作成
- 質問追加・編集
- 回答結果一覧
- CSV エクスポート

### 昇格条件との連携

完了すると:
- 基礎テスト: `basicTestCompleted: true`
- アンケート: `surveyCompleted: true`

### APIエンドポイント

- `GET /api/basic-test` - テスト取得
- `POST /api/basic-test` - 回答送信
- `GET /api/survey` - アンケート取得
- `POST /api/survey` - 回答送信
- `GET /api/admin/basic-test` - テスト管理
- `GET /api/admin/survey` - アンケート管理

### データベースモデル

```prisma
model BasicTest {
  id           String   @id
  title        String
  questions    Json
  passingScore Int      @default(80)
  createdAt    DateTime @default(now())
}

model BasicTestResult {
  id          String   @id
  userId      String
  testId      String
  score       Int
  answers     Json
  isPassed    Boolean
  completedAt DateTime @default(now())
}

model Survey {
  id          String   @id
  title       String
  questions   Json
  createdAt   DateTime @default(now())
}

model SurveySubmission {
  id          String   @id
  userId      String
  surveyId    String
  answers     Json
  submittedAt DateTime @default(now())
}
```

---

## 13. コンプライアンステスト

### 概要
FPエイド向けのコンプライアンス知識を確認するテスト。FPエイド昇格後、ガイダンス動画視聴前に合格が必要。

### 対象ユーザー
- **FPエイド（FPロール）のみ**
- MEMBERがアクセスした場合はダッシュボードにリダイレクト

### テスト仕様

#### 合格条件
- **合格ライン: 90%以上**
- 再受験: 何度でも可能
- 不合格時: 間違えた問題の解説を表示

#### 問題形式
- 選択式（複数選択肢）
- カテゴリー分類可能
- 管理者が問題を設定・編集

### 機能詳細

#### テスト受験 (`/dashboard/compliance-test`)

**表示ステップ:**

1. **イントロ画面**
   - テスト概要表示
   - 問題数表示
   - 合格ライン表示（90%）
   - 過去の受験履歴（最新5件）
   - 「テストを開始する」ボタン

2. **テスト画面**
   - 1問ずつ表示
   - 進捗バー表示
   - 問題番号ナビゲーション（クリックで移動可能）
   - 回答済み問題はハイライト表示
   - 「前の問題」「次の問題」ボタン

3. **結果画面**
   - 合格/不合格表示
   - スコア表示（%と正解数/総問題数）
   - 問題別結果
     - 正解: 緑色ハイライト
     - 不正解: 赤色ハイライト、解説表示
   - 合格時: 「ガイダンス動画へ進む」ボタン
   - 不合格時: 「もう一度受験する」ボタン

#### 管理者画面 (`/dashboard/admin/compliance-test`)

**問題管理:**
- 問題一覧表示
- 新規問題作成
- 問題編集
- 問題削除
- 並び順変更（ドラッグ&ドロップ）
- カテゴリー設定

**受験履歴:**
- 全ユーザーの受験履歴
- スコア・合否・受験日時

### ロール変更との連携

**重要:** FPエイドがMEMBERに降格された場合:
- `complianceTestPassed: false` にリセット
- `fpOnboardingCompleted: false` にリセット
- 再度FPエイドに昇格時は、再受験が必要

### APIエンドポイント

#### ユーザー向け
- `GET /api/user/compliance-test` - テスト問題と合格状況取得
- `POST /api/user/compliance-test` - 回答提出

#### 管理者向け
- `GET /api/admin/compliance-test/questions` - 問題一覧
- `POST /api/admin/compliance-test/questions` - 問題作成
- `PUT /api/admin/compliance-test/questions/[id]` - 問題更新
- `DELETE /api/admin/compliance-test/questions/[id]` - 問題削除
- `POST /api/admin/compliance-test/questions/reorder` - 並び順変更
- `GET /api/admin/compliance-test/attempts` - 受験履歴一覧

### データベースモデル

```prisma
model ComplianceTestQuestion {
  id           String   @id @default(cuid())
  question     String   @db.Text
  options      Json     // 選択肢配列
  correctIndex Int      // 正解のインデックス
  explanation  String?  @db.Text  // 解説（不正解時に表示）
  category     String?  // カテゴリー
  order        Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  attempts     ComplianceTestAnswer[]
}

model ComplianceTestAttempt {
  id             String   @id @default(cuid())
  userId         String
  totalQuestions Int
  correctCount   Int
  score          Float    // パーセンテージ
  isPassed       Boolean
  createdAt      DateTime @default(now())

  user    User                     @relation(fields: [userId], references: [id])
  answers ComplianceTestAnswer[]
}

model ComplianceTestAnswer {
  id              String   @id @default(cuid())
  attemptId       String
  questionId      String
  selectedAnswer  Int
  isCorrect       Boolean
  createdAt       DateTime @default(now())

  attempt  ComplianceTestAttempt    @relation(fields: [attemptId], references: [id])
  question ComplianceTestQuestion   @relation(fields: [questionId], references: [id])

  @@unique([attemptId, questionId])
}

model User {
  complianceTestPassed    Boolean   @default(false)
  complianceTestPassedAt  DateTime?
  // ...
}
```

---

## 14. 事前アンケート機能

### 概要
LP面談の前にメンバーが回答する事前アンケート。管理者がテンプレートを作成し、面談予約時に自動的に回答依頼が送られる。

### 対象ユーザー
- **LP面談を予約したMEMBER**
- FPは面談管理画面で回答を確認可能

### 機能詳細

#### アンケート回答 (`/dashboard/pre-interview`)

**回答フロー:**
1. LP面談予約時にアンケートが自動作成
2. メンバーがアンケートページにアクセス
3. 質問に回答（途中保存可能）
4. 全必須項目回答後に「送信」
5. FPに通知

**回答ステータス:**
```
NOT_STARTED  未開始
IN_PROGRESS  回答中（途中保存済み）
COMPLETED    回答完了
```

#### 質問タイプ
- **TEXT**: テキスト入力
- **TEXTAREA**: 長文テキスト
- **RADIO**: ラジオボタン（単一選択）
- **CHECKBOX**: チェックボックス（複数選択）
- **SELECT**: プルダウン選択

#### テンプレート管理 (`/dashboard/admin/pre-interview-templates`)

**管理者機能:**
- テンプレート作成・編集
- 質問追加・削除
- 質問の並び順変更
- 必須/任意設定
- デフォルトテンプレート設定

#### FP側の確認 (`/dashboard/lp-meeting/manage`)

面談管理画面で:
- 回答ステータス確認
- 回答内容閲覧
- 回答完了通知受信

### 通知連携

**回答完了時:**
- 担当FPにアプリ内通知
- 通知タイプ: `PRE_INTERVIEW_COMPLETED`

### APIエンドポイント

#### ユーザー向け
- `GET /api/pre-interview` - 自分のアンケート回答状況取得
- `POST /api/pre-interview` - 回答保存（途中保存・完了）
- `GET /api/pre-interview/[responseId]` - 回答詳細取得

#### 管理者向け
- `GET /api/admin/pre-interview-templates` - テンプレート一覧
- `POST /api/admin/pre-interview-templates` - テンプレート作成
- `PUT /api/admin/pre-interview-templates/[id]` - テンプレート更新
- `DELETE /api/admin/pre-interview-templates/[id]` - テンプレート削除

### データベースモデル

```prisma
model PreInterviewTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(true)
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  questions   PreInterviewQuestion[]
  responses   PreInterviewResponse[]
}

model PreInterviewQuestion {
  id         String                   @id @default(cuid())
  templateId String
  question   String                   @db.Text
  type       PreInterviewQuestionType // TEXT/TEXTAREA/RADIO/CHECKBOX/SELECT
  options    Json?                    // 選択肢（RADIO/CHECKBOX/SELECT用）
  required   Boolean                  @default(false)
  order      Int                      @default(0)
  createdAt  DateTime                 @default(now())
  updatedAt  DateTime                 @updatedAt

  template   PreInterviewTemplate     @relation(fields: [templateId], references: [id])
  answers    PreInterviewAnswer[]
}

model PreInterviewResponse {
  id                    String                      @id @default(cuid())
  templateId            String
  respondentId          String                      // 回答者（MEMBER）
  lpMeetingId           String?                     // 関連するLP面談
  status                PreInterviewResponseStatus  // NOT_STARTED/IN_PROGRESS/COMPLETED
  startedAt             DateTime?
  completedAt           DateTime?
  completionNotifiedAt  DateTime?                   // FPへの通知送信日時
  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt

  template   PreInterviewTemplate  @relation(fields: [templateId], references: [id])
  respondent User                  @relation(fields: [respondentId], references: [id])
  lpMeeting  LPMeeting?            @relation(fields: [lpMeetingId], references: [id])
  answers    PreInterviewAnswer[]
}

model PreInterviewAnswer {
  id         String   @id @default(cuid())
  responseId String
  questionId String
  value      Json     // 回答値（文字列または配列）
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  response   PreInterviewResponse  @relation(fields: [responseId], references: [id])
  question   PreInterviewQuestion  @relation(fields: [questionId], references: [id])

  @@unique([responseId, questionId])
}
```

---

## 15. 個別相談機能

### 概要
メンバーが各種相談（ライフプラン、住宅、転職など）を申請できる機能。管理者が対応・管理。

### 対象ユーザー
- **全認証済みユーザー**

### 相談ジャンル

| ジャンル | コード | 説明 |
|---------|--------|------|
| ライフプラン | LIFE_PLAN | 将来設計、資産形成など |
| 住宅 | HOUSING | 住宅ローン、購入相談など |
| 転職 | CAREER | キャリア相談、転職支援など |
| 賃貸 | RENTAL | 賃貸物件相談など |
| その他 | OTHER | 上記以外の相談 |

### 連絡方法

| 方法 | コード | 説明 |
|------|--------|------|
| 電話 | PHONE | 電話での連絡希望 |
| メール | EMAIL | メールでの連絡希望 |
| LINE | LINE | LINEでの連絡希望 |
| その他 | OTHER | その他の方法 |

### 機能詳細

#### 相談申請 (`/dashboard/consultation`)

**申請画面:**
- 相談ジャンル選択
- 電話番号入力
- 相談内容入力
- 希望連絡方法選択
- 希望日時選択（複数可）
- 添付ファイル（オプション）

**ジャンル別ページ:**
- `/dashboard/consultation/[type]`
- 例: `/dashboard/consultation/life-plan`

#### 相談履歴 (`/dashboard/consultation/history`)

**表示内容:**
- 自分の相談一覧
- ステータス（未対応/対応中/完了）
- 相談ジャンル
- 申請日時
- 担当者（アサイン済みの場合）

#### 管理者画面 (`/dashboard/admin/consultations`)

**一覧表示:**
- 全相談一覧
- ステータス別フィルター
- ジャンル別フィルター
- 統計情報表示
  - 総件数
  - 未対応件数
  - 対応中件数
  - 完了件数
  - ジャンル別件数

**詳細画面 (`/dashboard/admin/consultations/[id]`):**
- 相談内容詳細
- ユーザー情報
- 添付ファイル閲覧
- ステータス変更
- 担当者アサイン
- 管理者メモ入力

### 相談ステータス

```
PENDING       未対応
  ↓ 管理者が対応開始
IN_PROGRESS   対応中
  ↓ 対応完了
COMPLETED     完了
```

### 通知連携

**申請時:**
- 全管理者にアプリ内通知
- 通知タイプ: `CONSULTATION_SUBMITTED`

### APIエンドポイント

#### ユーザー向け
- `POST /api/consultations` - 相談申請
- `GET /api/consultations` - 自分の相談履歴
- `POST /api/consultations/upload` - 添付ファイルアップロード

#### 管理者向け
- `GET /api/admin/consultations` - 相談一覧
- `GET /api/admin/consultations/[id]` - 相談詳細
- `PUT /api/admin/consultations/[id]` - 相談更新（ステータス、担当者など）

### データベースモデル

```prisma
model Consultation {
  id               String              @id @default(cuid())
  userId           String
  type             ConsultationType    // LIFE_PLAN/HOUSING/CAREER/RENTAL/OTHER
  phoneNumber      String
  content          String              @db.Text
  preferredContact ContactMethod       // PHONE/EMAIL/LINE/OTHER
  preferredDates   DateTime[]          // 希望日時（複数）
  attachmentUrl    String?             // 添付ファイルURL
  attachmentName   String?             // 添付ファイル名
  status           ConsultationStatus  // PENDING/IN_PROGRESS/COMPLETED
  handlerId        String?             // 担当者ID
  adminNotes       String?             @db.Text  // 管理者メモ
  completedAt      DateTime?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  user    User  @relation("UserConsultations", fields: [userId], references: [id])
  handler User? @relation("ConsultationHandler", fields: [handlerId], references: [id])
}
```

---

## 16. FAQ・お問い合わせ

> **注:** 以前は「13. FAQ・お問い合わせ」でしたが、新機能追加により番号が変更されました。

### 概要
よくある質問と個別問い合わせ機能。

### FAQ

#### FAQ閲覧 (`/dashboard/support/faq`)

機能:
- カテゴリー別表示
- アコーディオン形式
- 検索機能

#### FAQ管理（管理者） (`/dashboard/admin/faq`)

機能:
- カテゴリー作成・編集
- FAQ追加・編集・削除
- 並び順変更
- 公開/非公開設定

### お問い合わせ

#### お問い合わせ送信 (`/dashboard/support/contact`)

入力項目:
- 問い合わせ種別:
  - アカウント関連
  - 支払い関連
  - コンテンツ関連
  - 技術的な問題
  - その他
- 件名
- 本文
- 添付ファイル（オプション）

#### お問い合わせ管理（管理者） (`/dashboard/admin/contacts`)

機能:
- 問い合わせ一覧
- ステータス管理:
  - PENDING（未対応）
  - IN_PROGRESS（対応中）
  - RESOLVED（解決済み）
  - CLOSED（クローズ）
- 管理者メモ
- 対応者記録

### APIエンドポイント

- `GET /api/faq` - FAQ一覧
- `POST /api/contact` - お問い合わせ送信
- `GET /api/admin/faq` - FAQ管理
- `GET /api/admin/contacts` - お問い合わせ管理
- `PUT /api/admin/contacts/[contactId]` - ステータス更新

### データベースモデル

```prisma
model FAQCategory {
  id          String  @id
  name        String
  description String?
  order       Int
  isActive    Boolean @default(true)
}

model FAQ {
  id          String  @id
  categoryId  String
  question    String
  answer      String  @db.Text
  order       Int
  isPublished Boolean @default(true)
}

model ContactSubmission {
  id            String        @id
  userId        String
  name          String
  email         String
  type          ContactType
  subject       String?
  message       String        @db.Text
  attachmentUrl String?
  status        ContactStatus @default(PENDING)
  adminNotes    String?
  respondedBy   String?
  respondedAt   DateTime?
  createdAt     DateTime      @default(now())
}
```

---

## 17. 名刺注文機能

### 概要
FPエイド・マネージャー向けの名刺注文システム。Stripe決済対応。

### アクセス権限
- FPエイド以上のみ利用可能

### 機能詳細

#### 名刺注文 (`/dashboard/business-card/order`)

手順:
1. **デザイン選択**
   - プレビュー画像で確認
   - デザインを選択

2. **印字情報入力**
   - 表示名（漢字）
   - 表示名（カナ）
   - 電話番号
   - メールアドレス

3. **受取方法選択**
   - 本社手渡し
   - 郵送（送料込み）

4. **郵送先入力**（郵送の場合）
   - 郵便番号
   - 都道府県
   - 市区町村
   - 番地
   - 建物名・部屋番号

5. **数量・メモ**
   - 数量（デフォルト: 100枚）
   - 備考欄

6. **Stripe決済**
   - 決済ページに遷移
   - カード決済

7. **注文完了**

#### 注文履歴 (`/dashboard/business-card/history`)

表示内容:
- 注文日
- デザイン
- 数量
- 受取方法
- ステータス:
  - PENDING（決済待ち）
  - PAID（決済完了）
  - ORDERED（発注済み）
  - SHIPPED（発送済み）
  - COMPLETED（完了）

#### 名刺管理（管理者） (`/dashboard/admin/business-card`)

**デザイン管理:**
- デザイン追加
- プレビュー画像アップロード
- 有効/無効設定
- 並び順変更

**注文管理:**
- 注文一覧
- ステータス更新
- 発送管理
- 管理メモ

### APIエンドポイント

#### ユーザー向け
- `GET /api/business-card/designs` - デザイン一覧
- `POST /api/business-card/checkout` - 決済開始
- `POST /api/business-card/verify-payment` - 決済確認
- `GET /api/business-card/orders` - 注文履歴

#### 管理者向け
- `GET /api/admin/business-card/designs` - デザイン管理
- `POST /api/admin/business-card/designs` - デザイン追加
- `PUT /api/admin/business-card/designs/[designId]` - デザイン更新
- `POST /api/admin/business-card/designs/upload-preview` - プレビューアップロード
- `GET /api/admin/business-card/orders` - 注文一覧
- `PUT /api/admin/business-card/orders/[orderId]` - 注文更新

### データベースモデル

```prisma
model BusinessCardDesign {
  id          String  @id
  name        String
  description String?
  previewUrl  String?
  isActive    Boolean @default(true)
  order       Int     @default(0)
}

model BusinessCardOrder {
  id               String                      @id
  userId           String
  designId         String
  displayName      String
  displayNameKana  String
  phoneNumber      String
  email            String
  deliveryMethod   BusinessCardDeliveryMethod
  postalCode       String?
  prefecture       String?
  city             String?
  addressLine1     String?
  addressLine2     String?
  quantity         Int                         @default(100)
  notes            String?
  paymentStatus    BusinessCardPaymentStatus
  stripeSessionId  String?
  paidAmount       Int?
  paidAt           DateTime?
  status           BusinessCardOrderStatus
  adminNotes       String?
  processedBy      String?
  shippedAt        DateTime?
  completedAt      DateTime?
}
```

---

## 18. チーム管理機能

### 概要
マネージャー向けのチーム管理機能。

### 機能詳細

#### チームダッシュボード (`/dashboard/team`)

表示内容:
- チームメンバー一覧
- メンバーの基本情報
- 活動状況
- チーム統計

#### チーム統計

API: `GET /api/team/stats`

表示データ:
- チーム全体の契約数
- 月次実績
- メンバー別ランキング

### APIエンドポイント

- `GET /api/team/members` - チームメンバー一覧
- `GET /api/team/stats` - チーム統計

---

## 19. サブスクリプション管理

### 概要
月額サブスクリプションの管理。Stripe連携。

### 機能詳細

#### サブスクリプション状況 (`/dashboard/settings/subscription`)

表示内容:
- 現在のプラン
- 次回更新日
- 支払い方法
- ステータス:
  - ACTIVE（有効）
  - CANCELED（解約済み）
  - PAST_DUE（支払い遅延）
  - UNPAID（未払い）

機能:
- 支払い方法変更
- サブスクリプション解約
- 再開

### 解約フロー

1. **解約申請**
   - 理由選択
   - コメント入力

2. **即時解約 or 期間満了後解約**
   - ユーザーが選択

3. **Stripe処理**
   - Webhook受信
   - ステータス更新

### APIエンドポイント

- `GET /api/subscription/status` - サブスク状況
- `GET /api/user/subscription` - 詳細情報
- `POST /api/user/subscription/cancel` - 解約
- `POST /api/user/subscription/reactivate` - 再開
- `POST /api/user/subscription/update-payment-method` - 支払い方法変更
- `GET /api/user/subscription/invoices` - 請求書履歴

### データベースモデル

```prisma
model Subscription {
  id                   String             @id
  userId               String
  stripeCustomerId     String?            @unique
  stripeSubscriptionId String?            @unique
  status               SubscriptionStatus
  currentPeriodEnd     DateTime?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
}
```

---

## 20. プロフィール・アカウント設定

### 概要
ユーザー情報の管理。

### プロフィール設定 (`/dashboard/settings/profile`)

編集可能項目:
- 名前
- **会員番号**（読み取り専用）
- 電話番号
- 住所
- 自己紹介
- 性別
- 生年月日
- 都道府県
- プロフィール画像

### アカウント設定 (`/dashboard/settings/account`)

機能:
- パスワード変更
- メール通知設定
- 退会申請

### APIエンドポイント

- `PUT /api/user/update-profile` - プロフィール更新
- `POST /api/user/change-password` - パスワード変更
- `POST /api/user/upload-profile-image` - プロフィール画像アップロード
- `POST /api/user/cancel-request` - 退会申請

---

## 21. 管理者機能

### 概要
システム全体の管理機能。

### ダッシュボード (`/dashboard/admin`)

表示内容:
- ユーザー統計
- ロール別統計
- 月次推移グラフ
- 最近のアクティビティ

### 分析機能 (`/dashboard/admin/analytics`)

機能:
- 会員統計 (`/api/admin/analytics/membership`)
  - ステータス別集計
  - 月次推移
  - ロール別分布

- ロール別統計 (`/api/admin/analytics/role-stats`)
  - ロールごとの人数
  - 昇格率
  - 活動状況

### ユーザー管理 (`/dashboard/admin/users`)

機能:
- ユーザー一覧
  - フィルター（ロール、ステータス、検索）
  - 検索（名前、メール、**会員番号**）
  - ソート
- ユーザー詳細
- ロール変更
- ステータス変更
- 一括メール送信
- 一括ステータス変更
- CSV エクスポート

### メール送信履歴 (`/dashboard/admin/email-history`)

機能:
- キャンペーン一覧
- 配信状況（成功/失敗）
- 個別配信ログ
- 再送機能

### その他管理機能

- イベント管理
- コース・レッスン管理
- 資料管理
- FAQ管理
- お問い合わせ管理
- 報酬管理
- 昇格申請管理
- LP面談管理
- 名刺注文管理
- **コンプライアンステスト管理** ← NEW
- **事前アンケートテンプレート管理** ← NEW
- **個別相談管理** ← NEW

---

## 🚨 既知の問題点

### 高優先度

#### 1. イベント詳細ページの欠如

**問題:**
- ユーザー向けイベント詳細ページが未実装
- イベント一覧から詳細に遷移できない
- 通知から一覧ページにしか遷移しない

**影響:**
- イベント詳細情報を確認できない
- 過去イベントの写真・資料を閲覧できない

**対応予定:**
- `/dashboard/events/[eventId]/page.tsx` を実装
- 詳細表示、参加登録、出席確認機能を追加

### 中優先度

#### 2. 会員番号の必須化

**現状:**
- `memberId String? @unique`（nullable）

**対応予定:**
- 全ユーザーへの付与完了後、必須化
- schema.prisma 更新

#### 3. middleware.ts の実装

**目的:**
- グローバルな認証・認可チェック
- セキュリティ強化

**対応予定:**
- 認証チェック
- ロール別アクセス制御

### 低優先度

#### 4. デバッグログの整理

**現状:**
- 本番環境でもデバッグログが出力される

**対応予定:**
- 環境変数でログレベル制御

---

## 📊 技術スタック

### フロントエンド
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Radix UI + shadcn/ui
- Lucide React

### バックエンド
- Next.js API Routes
- PostgreSQL (Supabase)
- Prisma 6
- Supabase Auth
- Supabase Storage
- Stripe

---

## 🎯 システム統計

- **実装機能数**: 23以上
- **データベースモデル**: 40以上
- **APIエンドポイント**: 160以上
- **ページ数**: 70ページ以上
- **コード行数**: 約60,000行

---

## 📝 更新履歴

- **2025-12-01**: バージョン2.0に更新
  - コンプライアンステスト機能を追加（セクション13）
  - 事前アンケート機能を追加（セクション14）
  - 個別相談機能を追加（セクション15）
  - LP面談機能の更新（NO_SHOWステータス、再申請機能）
  - FP昇格フローにコンプライアンステストを追加
  - ロール変更時のデータリセットロジックを文書化
  - セクション番号を再編成（16-21に変更）

- **2025-01-25**: 実装ベースで全面改訂（バージョン1.0）
  - 実際の実装状況を反映
  - 既知の問題点を明記
  - 会員番号機能の詳細を追加
  - 名刺注文機能を追加

---

## 🔗 関連ドキュメント

- [README.md](./README.md) - プロジェクト概要
- [REQUIREMENTS.md](./REQUIREMENTS.md) - 要件定義書
- [prisma/schema.prisma](./prisma/schema.prisma) - データベーススキーマ

---

**このドキュメントは実装ベースで作成されています。**
**仕様書との差分がある場合、現在の実装が優先されます。**
