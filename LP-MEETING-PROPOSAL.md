# LP面談システム実装提案

## 📋 概要

FPエイド昇格の条件の一つである「LP面談完了」を実現するため、FPエイドがメンバーと面談を行うための予約・管理システムを提案します。

---

## 🎯 要件

### 基本要件
1. **メンバー側**: LP面談の予約申請ができる（希望日を5つ選択）
2. **運営側（管理者）**: 希望日とFPエイドを選択して面談を確定
3. **FPエイド側**: 確定された面談の確認、面談完了の確認ができる
4. **システム側**: 面談完了を自動的に昇格条件に反映

### 制約条件
- FPエイドのみが面談を実施できる
- メンバーは1回の面談予約のみ可能（完了まで）
- **面談はオンラインのみ**（オフラインは不要）
- 運営側が希望日とFPエイドを選択して面談を確定
- 面談完了後、FPエイドが確認して完了ステータスに更新

---

## 📊 データベース設計

### 新規モデル: `LPMeeting`

```prisma
model LPMeeting {
  id              String            @id @default(cuid())
  memberId        String            // 面談を受けるメンバー
  fpId            String?           // 面談を実施するFPエイド（運営側が選択）
  status          LPMeetingStatus   @default(REQUESTED)
  preferredDates  Json              // 希望日時（5つ、DateTime[]）
  scheduledAt     DateTime?         // 確定日時（運営側が選択）
  completedAt     DateTime?         // 完了日時
  cancelledAt     DateTime?         // キャンセル日時
  meetingUrl      String?           // オンライン面談のURL（Zoom等）
  meetingPlatform MeetingPlatform?  // 使用するプラットフォーム
  notes            String?          // 面談メモ（FPエイドが記入）
  memberNotes     String?          // メンバーからの要望・質問
  assignedBy      String?           // 面談を確定した管理者のID
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  member          User              @relation("LPMeetingMember", fields: [memberId], references: [id], onDelete: Cascade)
  fp              User?              @relation("LPMeetingFP", fields: [fpId], references: [id], onDelete: SetNull)
  assigner        User?              @relation("LPMeetingAssigner", fields: [assignedBy], references: [id], onDelete: SetNull)

  @@unique([memberId]) // 1メンバーにつき1つのアクティブな面談のみ
  @@index([fpId, status])
  @@index([memberId, status])
  @@index([status])
  @@map("lp_meetings")
}

enum LPMeetingStatus {
  REQUESTED      // 予約申請中（運営側の確認待ち）
  SCHEDULED      // 日時確定済み（運営側が確定）
  COMPLETED      // 面談完了
  CANCELLED      // キャンセル
  NO_SHOW        // ノーショー
}

enum MeetingPlatform {
  ZOOM           // Zoom
  GOOGLE_MEET    // Google Meet
  TEAMS          // Microsoft Teams
  OTHER          // その他（URLを直接入力）
}
```

### Userモデルの拡張

```prisma
model User {
  // ... 既存フィールド
  lpMeetingsAsMember  LPMeeting[]  @relation("LPMeetingMember")
  lpMeetingsAsFP      LPMeeting[]  @relation("LPMeetingFP")
  lpMeetingsAssigned  LPMeeting[]  @relation("LPMeetingAssigner") // 管理者が確定した面談
}
```

---

## 🔄 フロー設計

### 1. メンバー側のフロー

```
1. メンバーが「LP面談予約」ページにアクセス
   ↓
2. 面談希望情報を入力
   - 希望日時を5つ選択（カレンダーから選択）
   - 要望・質問事項（任意）
   ↓
3. 予約申請を送信
   ↓
4. 運営側（管理者）に通知が送信される
   ↓
5. 【運営側が希望日とFPエイドを選択】
   ↓
6. メンバーとFPエイドの両方に通知が送信される
   ↓
7. 面談実施（オンライン）
   ↓
8. FPエイドが面談完了を確認
   ↓
9. FPPromotionApplicationのlpMeetingCompletedが自動更新
```

### 2. 運営側（管理者）のフロー

```
1. 管理者が「LP面談管理（管理者）」ページにアクセス
   ↓
2. 予約申請一覧を確認（ステータス: REQUESTED）
   ↓
3. 各申請の詳細を確認
   - メンバー情報
   - 希望日時（5つ）
   - 要望・質問事項
   ↓
4. 希望日時とFPエイドを選択
   - 希望日時から1つを選択
   - FPエイドを選択（ドロップダウンまたは検索）
   - オンライン面談のURLを設定（後述）
   ↓
5. 「面談を確定」ボタンをクリック
   ↓
6. メンバーとFPエイドの両方に通知が送信される
   - 確定日時
   - FPエイド名
   - オンライン面談のURL
```

### 3. FPエイド側のフロー

```
1. FPエイドが「LP面談管理」ページにアクセス
   ↓
2. 確定された面談一覧を確認（ステータス: SCHEDULED）
   ↓
3. 面談の詳細を確認
   - メンバー情報
   - 面談日時
   - オンライン面談のURL
   - メンバーの要望・質問事項
   ↓
4. 面談実施（オンライン）
   ↓
5. 面談完了ボタンをクリック
   - 面談メモを記入（任意）
   ↓
6. システムが完了ステータスに更新
   ↓
7. メンバーに通知が送信される
```

---

## 🎨 UI設計

### 1. メンバー側: LP面談予約ページ (`/dashboard/lp-meeting/request`)

**機能**:
- 面談希望日時の入力（カレンダー形式、**5つ選択**）
- 要望・質問事項の入力（任意）
- 現在の予約状況の表示
- 予約申請の送信

**表示内容**:
- 現在の予約ステータス（未申請 / 申請中 / 予約済み / 完了）
- 申請中の場合: 申請した希望日時（5つ）
- 予約済みの場合: 確定日時、FPエイド名、オンライン面談のURL
- 完了の場合: 完了日時、FPエイドからのメモ

### 2. 運営側（管理者）: LP面談管理ページ (`/dashboard/admin/lp-meetings`)

**機能**:
- 予約申請一覧の表示（ステータス: REQUESTED）
- 希望日時とFPエイドの選択
- オンライン面談URLの設定
- 面談の確定
- 全面談の一覧表示・管理
- 統計情報の表示

**表示内容**:
- 予約申請一覧（ステータス: REQUESTED）
- 各申請の詳細情報:
  - メンバー名・メールアドレス
  - 希望日時（5つ、選択可能）
  - 要望・質問事項
- 確定済み面談一覧
- 統計情報（申請数、確定数、完了数等）

**操作フロー**:
1. 申請をクリックして詳細を表示
2. 希望日時から1つを選択（ラジオボタン）
3. FPエイドを選択（ドロップダウン）
4. オンライン面談URLを設定（後述の方法から選択）
5. 「面談を確定」ボタンをクリック

### 3. FPエイド側: LP面談管理ページ (`/dashboard/lp-meeting/manage`)

**機能**:
- 確定された面談一覧の表示（自分の面談のみ）
- 面談の詳細確認
- 面談完了の確認
- 面談メモの記入

**表示内容**:
- 確定済み面談一覧（ステータス: SCHEDULED）
- 各面談の詳細情報:
  - メンバー名・メールアドレス
  - 面談日時
  - オンライン面談のURL
  - メンバーの要望・質問事項
- カレンダー表示（予約済み面談の一覧）

### オンライン面談URLの設定方法（運営側）

以下の3つの方法から選択可能：

#### 方法1: プラットフォーム選択 + 自動生成
- Zoom、Google Meet、Teamsから選択
- システムが自動的にURLを生成（API連携が必要）

#### 方法2: プラットフォーム選択 + 手動入力
- プラットフォームを選択（Zoom、Google Meet、Teams、その他）
- URLを手動で入力

#### 方法3: テンプレートURL + 日時パラメータ
- 各FPエイドにテンプレートURLを設定
- 日時を自動的にパラメータとして追加

**推奨**: 方法2（シンプルで確実）

---

## 🔌 API設計

### メンバー側API

#### 1. 面談予約申請
```
POST /api/lp-meetings/request
Body: {
  memberId: string
  preferredDates: DateTime[]  // 希望日時（5つ、必須）
  memberNotes?: string        // 要望・質問事項（任意）
}
Response: {
  success: boolean
  meeting: LPMeeting
}
```

#### 2. 自分の面談状況取得
```
GET /api/lp-meetings/my-meeting?userId={userId}
Response: {
  meeting: LPMeeting | null
}
```

### 運営側（管理者）API

#### 3. 予約申請一覧取得
```
GET /api/admin/lp-meetings?status=REQUESTED
Response: {
  meetings: LPMeeting[]
}
```

#### 4. 面談の確定（希望日時とFPエイドを選択）
```
POST /api/admin/lp-meetings/{meetingId}/schedule
Body: {
  scheduledAt: DateTime        // 希望日時から1つを選択
  fpId: string                // FPエイドを選択
  meetingUrl: string          // オンライン面談のURL
  meetingPlatform: string     // 'ZOOM' | 'GOOGLE_MEET' | 'TEAMS' | 'OTHER'
}
Response: {
  success: boolean
  meeting: LPMeeting
}
```

#### 5. 全面談一覧取得
```
GET /api/admin/lp-meetings?status={status}&fpId={fpId}&memberId={memberId}
Response: {
  meetings: LPMeeting[]
  statistics: {
    total: number
    requested: number
    scheduled: number
    completed: number
    cancelled: number
  }
}
```

### FPエイド側API

#### 6. 自分の面談一覧取得
```
GET /api/lp-meetings/my-scheduled?fpId={fpId}
Response: {
  meetings: LPMeeting[]
}
```

#### 7. 面談完了の確認
```
POST /api/lp-meetings/{meetingId}/complete
Body: {
  notes?: string  // 面談メモ（任意）
}
Response: {
  success: boolean
  meeting: LPMeeting
}
```

---

## 🔔 通知設計

### 通知タイプの追加

```typescript
enum NotificationType {
  // ... 既存の通知タイプ
  LP_MEETING_REQUESTED    // メンバーが面談予約申請 → 運営側（管理者）に通知
  LP_MEETING_SCHEDULED    // 運営側が面談を確定 → メンバーとFPエイドの両方に通知
  LP_MEETING_COMPLETED    // 面談完了 → メンバーに通知
  LP_MEETING_REMINDER     // 面談リマインダー（前日・1時間前）→ メンバーとFPエイドの両方に通知
}
```

### 通知タイミング

1. **メンバーが予約申請**: 運営側（管理者）に通知
   - タイトル: "LP面談の予約申請がありました"
   - メッセージ: "{メンバー名}さんからLP面談の予約申請がありました。希望日時を確認して面談を確定してください。"

2. **運営側が面談を確定**: メンバーとFPエイドの両方に通知
   - **メンバーへの通知**:
     - タイトル: "LP面談が確定しました"
     - メッセージ: "{日時}に{FPエイド名}さんとのLP面談が確定しました。オンライン面談のURL: {URL}"
   - **FPエイドへの通知**:
     - タイトル: "LP面談が確定しました"
     - メッセージ: "{日時}に{メンバー名}さんとのLP面談が確定しました。オンライン面談のURL: {URL}"

3. **面談前日**: リマインダー通知（メンバーとFPエイドの両方）
   - タイトル: "LP面談のリマインダー"
   - メッセージ: "明日{日時}にLP面談が予定されています。オンライン面談のURL: {URL}"

4. **面談1時間前**: リマインダー通知（メンバーとFPエイドの両方）
   - タイトル: "LP面談のリマインダー"
   - メッセージ: "1時間後にLP面談が予定されています。オンライン面談のURL: {URL}"

5. **面談完了**: メンバーに通知
   - タイトル: "LP面談が完了しました"
   - メッセージ: "FPエイド昇格の条件の一つであるLP面談が完了しました。"

---

## 🤖 自動化機能

### 1. FPエイド候補の提案（運営側の選択を支援）

運営側がFPエイドを選択する際に、候補を提案する機能：

```typescript
async function suggestFPCandidates(meetingId: string, scheduledAt: DateTime): Promise<User[]> {
  // 1. アクティブなFPエイドを取得
  const activeFPs = await prisma.user.findMany({
    where: {
      role: UserRole.FP,
      // アクティブなサブスクリプションがある
    }
  })

  // 2. 各FPエイドの負荷を計算
  const fpLoads = await Promise.all(
    activeFPs.map(async (fp) => {
      const activeMeetings = await prisma.lPMeeting.count({
        where: {
          fpId: fp.id,
          status: {
            in: ['SCHEDULED']
          }
        }
      })
      return { fp, load: activeMeetings }
    })
  )

  // 3. 負荷が少ない順にソートして返す（最大5名）
  return fpLoads
    .sort((a, b) => a.load - b.load)
    .slice(0, 5)
    .map(item => item.fp)
}
```

**UIでの表示**:
- 運営側が日時を選択すると、その日時に空きがあるFPエイドを候補として表示
- 負荷が少ない順に並べる

### 2. 面談確定時の通知送信

```typescript
async function scheduleLPMeeting(
  meetingId: string, 
  scheduledAt: DateTime, 
  fpId: string, 
  meetingUrl: string,
  meetingPlatform: string,
  assignedBy: string
) {
  // 1. 面談を確定ステータスに更新
  const meeting = await prisma.lPMeeting.update({
    where: { id: meetingId },
    data: {
      status: 'SCHEDULED',
      scheduledAt,
      fpId,
      meetingUrl,
      meetingPlatform: meetingPlatform as MeetingPlatform,
      assignedBy
    },
    include: {
      member: true,
      fp: true
    }
  })

  // 2. メンバーに通知を送信
  await createNotification({
    userId: meeting.memberId,
    type: 'LP_MEETING_SCHEDULED',
    title: 'LP面談が確定しました',
    message: `${formatDateTime(scheduledAt)}に${meeting.fp?.name}さんとのLP面談が確定しました。オンライン面談のURL: ${meetingUrl}`,
    actionUrl: `/dashboard/lp-meeting/request`
  })

  // 3. FPエイドに通知を送信
  if (meeting.fpId) {
    await createNotification({
      userId: meeting.fpId,
      type: 'LP_MEETING_SCHEDULED',
      title: 'LP面談が確定しました',
      message: `${formatDateTime(scheduledAt)}に${meeting.member.name}さんとのLP面談が確定しました。オンライン面談のURL: ${meetingUrl}`,
      actionUrl: `/dashboard/lp-meeting/manage`
    })
  }
}
```

### 3. 面談完了時の自動更新

```typescript
async function completeLPMeeting(meetingId: string, notes?: string) {
  // 1. 面談を完了ステータスに更新
  const meeting = await prisma.lPMeeting.update({
    where: { id: meetingId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      notes
    },
    include: {
      member: true
    }
  })

  // 2. FPPromotionApplicationのlpMeetingCompletedを更新
  await prisma.fPPromotionApplication.update({
    where: { userId: meeting.memberId },
    data: {
      lpMeetingCompleted: true
    }
  })

  // 3. メンバーに通知を送信
  await createNotification({
    userId: meeting.memberId,
    type: 'LP_MEETING_COMPLETED',
    title: 'LP面談が完了しました',
    message: 'FPエイド昇格の条件の一つであるLP面談が完了しました。',
    actionUrl: `/dashboard/promotion`
  })
}
```

### 4. リマインダー通知

**Vercel Cron**を使用して定期実行:

```typescript
// 毎日0時に実行（前日リマインダー）
async function sendLPMeetingReminders() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  // 翌日の面談を取得
  const meetings = await prisma.lPMeeting.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: {
        gte: tomorrow,
        lt: dayAfter
      }
    },
    include: {
      member: true,
      fp: true
    }
  })

  // メンバーとFPエイドの両方にリマインダーを送信
  for (const meeting of meetings) {
    await createNotification({
      userId: meeting.memberId,
      type: 'LP_MEETING_REMINDER',
      title: 'LP面談のリマインダー',
      message: `明日${formatDateTime(meeting.scheduledAt)}にLP面談が予定されています。オンライン面談のURL: ${meeting.meetingUrl}`,
      actionUrl: `/dashboard/lp-meeting/request`
    })

    if (meeting.fpId) {
      await createNotification({
        userId: meeting.fpId,
        type: 'LP_MEETING_REMINDER',
        title: 'LP面談のリマインダー',
        message: `明日${formatDateTime(meeting.scheduledAt)}にLP面談が予定されています。オンライン面談のURL: ${meeting.meetingUrl}`,
        actionUrl: `/dashboard/lp-meeting/manage`
      })
    }
  }
}

// 毎時0分に実行（1時間前リマインダー）
async function sendLPMeetingHourReminders() {
  const oneHourLater = new Date()
  oneHourLater.setHours(oneHourLater.getHours() + 1)
  oneHourLater.setMinutes(0, 0, 0)
  
  const oneHourLaterEnd = new Date(oneHourLater)
  oneHourLaterEnd.setMinutes(59, 59, 999)

  // 1時間後の面談を取得
  const meetings = await prisma.lPMeeting.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: {
        gte: oneHourLater,
        lte: oneHourLaterEnd
      }
    },
    include: {
      member: true,
      fp: true
    }
  })

  // メンバーとFPエイドの両方にリマインダーを送信
  for (const meeting of meetings) {
    await createNotification({
      userId: meeting.memberId,
      type: 'LP_MEETING_REMINDER',
      title: 'LP面談のリマインダー',
      message: `1時間後にLP面談が予定されています。オンライン面談のURL: ${meeting.meetingUrl}`,
      actionUrl: `/dashboard/lp-meeting/request`
    })

    if (meeting.fpId) {
      await createNotification({
        userId: meeting.fpId,
        type: 'LP_MEETING_REMINDER',
        title: 'LP面談のリマインダー',
        message: `1時間後にLP面談が予定されています。オンライン面談のURL: ${meeting.meetingUrl}`,
        actionUrl: `/dashboard/lp-meeting/manage`
      })
    }
  }
}
```

---

## 📱 ナビゲーション追加

### メンバー側
- **サイドバー**: 「LP面談予約」を追加（`/dashboard/lp-meeting/request`）
- **昇格管理ページ**: LP面談のステータスを表示し、予約ページへのリンクを追加

### FPエイド側
- **サイドバー**: 「LP面談管理」を追加（`/dashboard/lp-meeting/manage`）
- **通知**: 面談が確定した場合に通知を表示

### 管理者側
- **サイドバー**: 「LP面談管理（管理者）」を追加（`/dashboard/admin/lp-meetings`）
- **通知**: 予約申請があった場合に通知を表示（未処理の申請数をバッジ表示）

---

## 🎯 実装優先順位

### Phase 1: 基本機能（MVP）
1. ✅ データベーススキーマの追加
2. ✅ メンバー側: 面談予約申請機能（希望日時5つ選択）
3. ✅ 運営側（管理者）: 面談確定機能（希望日時とFPエイドを選択）
4. ✅ オンライン面談URLの設定機能
5. ✅ FPエイド側: 面談完了確認機能
6. ✅ 面談完了時の自動更新（FPPromotionApplication）

### Phase 2: 通知・リマインダー
7. ✅ 通知システムの統合
   - メンバー申請 → 運営側通知
   - 運営側確定 → メンバー・FPエイド通知
   - 面談完了 → メンバー通知
8. ✅ リマインダー通知（前日・1時間前）

### Phase 3: 最適化
9. ✅ FPエイド候補の提案機能
10. ✅ 管理者側の管理画面（統計情報含む）
11. ✅ カレンダー表示機能

### Phase 4: 拡張機能（将来）
12. カレンダー連携（Google Calendar等）
13. Zoom/Google Meet API連携（自動URL生成）
14. 面談録画・録音機能
15. 面談フィードバック機能

---

## 🔒 セキュリティ・バリデーション

### バリデーション
- メンバーは1つのアクティブな面談のみ持てる（`@@unique([memberId])`）
- 希望日時は**5つ**を厳密にチェック（多すぎても少なすぎてもエラー）
- 希望日時は未来の日時のみ許可
- オンライン面談URLは必須（空文字列は不可）
- FPエイドは自分の面談のみ操作可能
- 管理者はすべての面談を操作可能

### 権限チェック
- **メンバー**: 自分の面談のみ閲覧・申請可能
- **FPエイド**: 自分に割り当てられた面談のみ閲覧・完了操作可能
- **管理者**: すべての面談を閲覧・操作可能（確定・キャンセル等）

### データ整合性
- 面談が確定（`SCHEDULED`）されたら、`scheduledAt`、`fpId`、`meetingUrl`は必須
- 面談が完了（`COMPLETED`）されたら、`completedAt`は必須

---

## 📊 考慮事項

### 1. オンライン面談URLの管理方法

#### 推奨案: プラットフォーム選択 + 手動URL入力
- **メリット**: 
  - シンプルで確実
  - どのプラットフォームでも対応可能
  - 実装が簡単
- **デメリット**: 
  - 管理者が手動でURLを入力する必要がある

#### 代替案1: Zoom/Google Meet API連携
- **メリット**: 
  - 自動的にURLを生成できる
  - 管理が楽
- **デメリット**: 
  - API連携が必要（実装が複雑）
  - プラットフォームごとに実装が必要

#### 代替案2: FPエイドごとにテンプレートURLを設定
- **メリット**: 
  - 一度設定すれば使い回せる
- **デメリット**: 
  - FPエイドごとの設定が必要
  - 柔軟性が低い

**推奨**: まずは**プラットフォーム選択 + 手動URL入力**で実装し、将来的にAPI連携を検討

### 2. 希望日時の選択UI

**カレンダー形式**:
- カレンダーから日付を選択
- 時間を選択（例: 10:00, 14:00, 18:00等の候補から選択）
- 5つ選択するまで「申請」ボタンを無効化

**バリデーション**:
- 同じ日時を2回選択できない
- 過去の日時は選択できない
- 5つちょうど選択する必要がある

### 3. キャンセル処理
- **メンバーがキャンセル**: ステータスを`CANCELLED`に変更、再予約可能
- **運営側がキャンセル**: ステータスを`CANCELLED`に変更、メンバーに通知して再申請を促す

### 4. ノーショー対応
- FPエイドがノーショーを報告できる機能を追加（将来的な拡張）
- メンバーに再予約を促す通知

### 5. 面談時間の管理
- デフォルト: 60分（UI上で表示のみ、データベースには保存しない）
- 将来的にカスタマイズ可能にする場合は、`LPMeeting`モデルに`duration`フィールドを追加

---

## 🚀 実装時の注意点

1. **既存データとの整合性**
   - 既存の`FPPromotionApplication`の`lpMeetingCompleted`フィールドとの連携
   - 既存のメンバーが既に面談を完了している場合の処理

2. **マイグレーション**
   - 既存の`lpMeetingCompleted`が`true`の場合は、対応する`LPMeeting`レコードを作成

3. **パフォーマンス**
   - 面談一覧の取得時に適切なインデックスを使用
   - 通知の送信は非同期処理で実装

4. **ユーザー体験**
   - 予約申請から完了までの流れを明確に
   - エラーメッセージを分かりやすく
   - 通知で適切なタイミングで情報を提供

---

この提案に基づいて実装を進めることで、LP面談の予約から完了までをスムーズに管理できるシステムが構築できます。

