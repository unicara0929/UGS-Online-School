# Unicara Growth Salon 設計ドラフト

## 📋 目次
1. [ロール・権限設計](#ロール権限設計)
2. [データベーススキーマ拡張](#データベーススキーマ拡張)
3. [実装手順](#実装手順)

---

## ロール・権限設計

### ロール定義表

| ロール | Prisma Enum | TypeScript型 | 説明 | 権限レベル |
|--------|------------|--------------|------|-----------|
| UGS会員 | `MEMBER` | `'member'` | 一般会員 | 1 |
| FPエイド | `FP` | `'fp'` | FPエイド | 2 |
| マネージャー | `MANAGER` | `'manager'` | マネージャー | 3 |
| 運営 | `ADMIN` | `'admin'` | 管理者 | 4 |

### 権限マトリックス

| 機能 | MEMBER | FP | MANAGER | ADMIN |
|------|--------|----|---------|-------|
| コース閲覧 | ✅ | ✅ | ✅ | ✅ |
| コース受講 | ✅ | ✅ | ✅ | ✅ |
| FPコンテンツ閲覧 | ❌ | ✅ | ✅ | ✅ |
| 報酬管理 | ❌ | ✅ | ✅ | ✅ |
| イベント登録 | ✅ | ✅ | ✅ | ✅ |
| 必須イベント管理 | ❌ | ❌ | ✅ | ✅ |
| ユーザー管理 | ❌ | ❌ | ❌ | ✅ |
| サブスクリプション管理 | ❌ | ❌ | ❌ | ✅ |
| 報酬計算・承認 | ❌ | ❌ | ❌ | ✅ |
| 昇格承認 | ❌ | ❌ | ❌ | ✅ |

### ロール変換マッピング

**問題**: Prismaの`UserRole`は大文字（`MEMBER`, `FP`, `MANAGER`, `ADMIN`）、TypeScript型は小文字（`'member'`, `'fp'`, `'manager'`, `'admin'`）

**解決策**: 統一ヘルパー関数を作成

```typescript
// src/lib/utils/role-mapper.ts
export function prismaRoleToAppRole(role: UserRole): AppUserRole {
  const map: Record<UserRole, AppUserRole> = {
    MEMBER: 'member',
    FP: 'fp',
    MANAGER: 'manager',
    ADMIN: 'admin',
  }
  return map[role]
}

export function appRoleToPrismaRole(role: AppUserRole): UserRole {
  const map: Record<AppUserRole, UserRole> = {
    'member': UserRole.MEMBER,
    'fp': UserRole.FP,
    'manager': UserRole.MANAGER,
    'admin': UserRole.ADMIN,
  }
  return map[role]
}
```

---

## データベーススキーマ拡張

### 追加が必要なモデル

#### 1. Referral（紹介関係）

```prisma
model Referral {
  id              String   @id @default(cuid())
  referrerId      String   // 紹介者ID
  referredId      String   // 被紹介者ID
  referralType    ReferralType
  status          ReferralStatus @default(PENDING)
  rewardAmount    Int?     // 報酬金額
  rewardPaidAt    DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  referrer        User     @relation("Referrer", fields: [referrerId], references: [id])
  referred        User     @relation("Referred", fields: [referredId], references: [id])
  
  @@unique([referrerId, referredId])
  @@map("referrals")
}

enum ReferralType {
  MEMBER  // UGS会員紹介
  FP      // FPエイド紹介
}

enum ReferralStatus {
  PENDING   // 審査中
  APPROVED   // 承認済み
  REJECTED   // 却下
  REWARDED   // 報酬支払済み
}
```

#### 2. Contract（契約実績）

```prisma
model Contract {
  id              String   @id @default(cuid())
  userId          String
  contractNumber  String   @unique // 契約番号
  contractType    ContractType
  status          ContractStatus @default(ACTIVE)
  signedAt        DateTime
  amount          Int?     // 契約金額
  rewardAmount    Int?     // 報酬金額
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation(fields: [userId], references: [id])
  
  @@map("contracts")
}

enum ContractType {
  INSURANCE  // 保険契約
  OTHER      // その他
}

enum ContractStatus {
  ACTIVE     // 有効
  CANCELLED  // 解約
  EXPIRED    // 期限切れ
}
```

#### 3. Notification（通知）

```prisma
model Notification {
  id          String           @id @default(cuid())
  userId      String
  type        NotificationType
  priority    NotificationPriority @default(INFO)
  title       String
  message     String
  actionUrl   String?
  isRead      Boolean          @default(false)
  readAt      DateTime?
  createdAt   DateTime         @default(now())
  
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}

enum NotificationType {
  PROMOTION_ELIGIBLE    // 昇格可能
  PROMOTION_APPROVED    // 昇格承認
  PROMOTION_REJECTED    // 昇格却下
  COMPENSATION_READY    // 報酬確定
  COMPENSATION_PAID     // 報酬支払済み
  EVENT_REMINDER        // イベントリマインダー
  EVENT_REQUIRED        // 必須イベント通知
  REFERRAL_REWARDED     // 紹介報酬
  CONTRACT_ACHIEVED     // 契約達成
  ACTION_REQUIRED       // アクション必須
}

enum NotificationPriority {
  CRITICAL  // 赤：アクション必須
  INFO      // 青：情報通知
  SUCCESS   // 緑：達成通知
}
```

#### 4. PromotionApplication（昇格申請）

```prisma
model PromotionApplication {
  id              String                    @id @default(cuid())
  userId          String
  targetRole      UserRole
  status          PromotionStatus           @default(PENDING)
  appliedAt       DateTime                  @default(now())
  reviewedAt      DateTime?
  reviewedBy      String?                   // レビュアーID（ADMIN）
  reviewNotes     String?
  createdAt       DateTime                  @default(now())
  updatedAt       DateTime                  @updatedAt
  
  user            User                      @relation(fields: [userId], references: [id])
  reviewer        User?                     @relation("PromotionReviewer", fields: [reviewedBy], references: [id])
  
  @@unique([userId, targetRole])
  @@map("promotion_applications")
}

enum PromotionStatus {
  PENDING   // 申請中
  APPROVED   // 承認済み
  REJECTED   // 却下
}
```

### 既存モデルの拡張

#### Userモデル

```prisma
model User {
  // ... 既存フィールド ...
  
  // 新規リレーション
  referralsAsReferrer    Referral[]            @relation("Referrer")
  referralsAsReferred    Referral[]            @relation("Referred")
  contracts              Contract[]
  notifications          Notification[]
  promotionApplications  PromotionApplication[]
  reviewedPromotions     PromotionApplication[] @relation("PromotionReviewer")
  
  // 新規フィールド（オプション）
  referralCode          String?   @unique // 紹介コード
  bankAccount           Json?     // 振込口座情報
}
```

#### Compensationモデル

```prisma
model Compensation {
  // ... 既存フィールド ...
  
  // breakdownの構造を明確化（既存のJson型を維持しつつ、型定義を追加）
  // breakdown: {
  //   memberReferral: number
  //   fpReferral: number
  //   contract: number
  //   bonus: number
  //   deduction: number
  // }
}
```

---

## 実装手順

### Phase 1: ロール・権限の統一（2-3時間）

1. **ロールマッパーの実装**
   - `src/lib/utils/role-mapper.ts` 作成
   - Prisma ↔ TypeScript型変換関数

2. **既存コードの修正**
   - `src/lib/auth/supabase-auth-service.ts`: ロール変換を適用
   - `src/app/api/auth/profile/[userId]/route.ts`: ロール変換を適用
   - `src/app/api/admin/users/role/route.ts`: ロール変換を適用

3. **型定義の統一**
   - `src/lib/types/user.ts`: Prismaの`UserRole`をインポートして使用
   - または、アプリケーション側の型を維持し、マッパーで変換

### Phase 2: Prismaスキーマ拡張（1-2時間）

1. **スキーマ更新**
   - `prisma/schema.prisma` に新規モデル追加
   - 既存モデルにリレーション追加

2. **マイグレーション実行**
   ```bash
   npx prisma migrate dev --name add_referral_contract_notification
   ```

3. **Prisma Client生成**
   ```bash
   npx prisma generate
   ```

### Phase 3: 紹介システム実装（4-5時間）

1. **API実装**
   - `src/app/api/referrals/route.ts`: 紹介一覧取得
   - `src/app/api/referrals/register/route.ts`: 紹介登録
   - `src/app/api/referrals/[referralId]/approve/route.ts`: 紹介承認（ADMIN）

2. **紹介コード生成**
   - ユーザー登録時に`referralCode`を自動生成
   - 紹介リンク生成機能

3. **UI実装**
   - `src/components/referral/referral-dashboard.tsx`: 紹介ダッシュボード
   - `src/app/dashboard/referrals/page.tsx`: 紹介管理ページ

### Phase 4: 契約実績管理（3-4時間）

1. **API実装**
   - `src/app/api/contracts/route.ts`: 契約一覧・作成
   - `src/app/api/contracts/[contractId]/route.ts`: 契約更新・削除

2. **UI実装**
   - `src/components/contracts/contract-list.tsx`: 契約一覧
   - `src/app/dashboard/contracts/page.tsx`: 契約管理ページ

### Phase 5: 報酬計算ロジック（5-6時間）

1. **報酬計算サービス**
   - `src/lib/services/compensation-calculator.ts`: 報酬計算ロジック
   - 紹介報酬、契約報酬、ボーナスの計算

2. **月次報酬生成**
   - `src/app/api/admin/compensations/generate/route.ts`: 月次報酬生成（ADMIN）
   - Cronジョブまたは手動実行

3. **報酬承認フロー**
   - `src/app/api/admin/compensations/[compensationId]/approve/route.ts`: 報酬承認
   - `src/app/api/admin/compensations/[compensationId]/pay/route.ts`: 報酬支払い

### Phase 6: 昇格フロー自動化（4-5時間）

1. **昇格条件チェック**
   - `src/lib/services/promotion-eligibility.ts`: 昇格条件チェック
   - FP昇格: テスト合格、LP面談、アンケート
   - マネージャー昇格: 報酬実績、紹介実績、契約実績

2. **昇格申請API**
   - `src/app/api/promotions/apply/route.ts`: 昇格申請
   - `src/app/api/promotions/eligibility/route.ts`: 昇格可能性チェック

3. **昇格承認API（ADMIN）**
   - `src/app/api/admin/promotions/[applicationId]/approve/route.ts`: 昇格承認
   - `src/app/api/admin/promotions/[applicationId]/reject/route.ts`: 昇格却下

4. **UI実装**
   - `src/components/promotion/promotion-status.tsx`: 昇格状況表示
   - `src/app/dashboard/promotion/page.tsx`: 昇格申請ページ

### Phase 7: 通知システム（4-5時間）

1. **通知サービス**
   - `src/lib/services/notification-service.ts`: 通知作成・送信
   - リアルタイム通知（WebSocketまたはServer-Sent Events）

2. **通知API**
   - `src/app/api/notifications/route.ts`: 通知一覧取得
   - `src/app/api/notifications/[notificationId]/read/route.ts`: 既読マーク
   - `src/app/api/notifications/mark-all-read/route.ts`: 一括既読

3. **通知トリガー**
   - 報酬確定時
   - 昇格条件達成時
   - イベントリマインダー
   - 必須イベント通知

4. **UI実装**
   - `src/components/notifications/notification-bell.tsx`: 通知ベル
   - `src/components/notifications/notification-list.tsx`: 通知一覧
   - `src/app/dashboard/notifications/page.tsx`: 通知ページ

### Phase 8: Stripe拡張（3-4時間）

1. **サブスクリプション管理**
   - 既存の`Subscription`モデルを活用
   - Webhook処理の拡張

2. **報酬連携**
   - Stripe決済完了時の紹介報酬計算
   - サブスクリプション更新時の処理

### Phase 9: テスト・デバッグ（3-4時間）

1. **単体テスト**
   - 報酬計算ロジック
   - 昇格条件チェック

2. **統合テスト**
   - 紹介フロー
   - 昇格フロー
   - 報酬計算フロー

3. **E2Eテスト**
   - ユーザー登録 → 紹介 → 報酬
   - FP昇格 → マネージャー昇格

---

## 実装優先順位

### 高優先度（必須）
1. ✅ Phase 1: ロール・権限の統一
2. ✅ Phase 2: Prismaスキーマ拡張
3. ✅ Phase 3: 紹介システム実装
4. ✅ Phase 5: 報酬計算ロジック

### 中優先度（重要）
5. ✅ Phase 4: 契約実績管理
6. ✅ Phase 6: 昇格フロー自動化

### 低優先度（改善）
7. ✅ Phase 7: 通知システム
8. ✅ Phase 8: Stripe拡張
9. ✅ Phase 9: テスト・デバッグ

---

## 見積もり時間

| Phase | 作業内容 | 見積もり時間 |
|-------|---------|------------|
| Phase 1 | ロール・権限の統一 | 2-3時間 |
| Phase 2 | Prismaスキーマ拡張 | 1-2時間 |
| Phase 3 | 紹介システム実装 | 4-5時間 |
| Phase 4 | 契約実績管理 | 3-4時間 |
| Phase 5 | 報酬計算ロジック | 5-6時間 |
| Phase 6 | 昇格フロー自動化 | 4-5時間 |
| Phase 7 | 通知システム | 4-5時間 |
| Phase 8 | Stripe拡張 | 3-4時間 |
| Phase 9 | テスト・デバッグ | 3-4時間 |
| **合計** | | **29-37時間** |

**バッファ込み**: 35-45時間

---

## 注意事項

1. **データ移行**: 既存データがある場合、マイグレーション時に注意
2. **パフォーマンス**: 紹介・報酬計算のクエリ最適化
3. **セキュリティ**: 権限チェックをすべてのAPIエンドポイントに実装
4. **エラーハンドリング**: 各フェーズで適切なエラーハンドリングを実装
5. **ログ**: 重要な操作（昇格、報酬計算）はログを記録

---

## 次のステップ

1. この設計ドラフトをレビュー
2. Phase 1から順次実装開始
3. 各Phase完了時に動作確認・テスト
4. 問題があれば設計を見直し

