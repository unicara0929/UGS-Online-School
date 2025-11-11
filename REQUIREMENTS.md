# UGSオンラインスクール 要件定義書

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [システム要件](#システム要件)
3. [機能要件](#機能要件)
4. [非機能要件](#非機能要件)
5. [データモデル](#データモデル)
6. [ユーザーロールと権限](#ユーザーロールと権限)
7. [API仕様](#api仕様)
8. [UI/UX要件](#uiux要件)
9. [統合要件](#統合要件)

---

## プロジェクト概要

### 目的
「学び → 実践 → 自立」を一体化したFP育成プラットフォームを構築し、教育・昇格・報酬管理・イベント運営を1つのUXで完結させる。

### 対象ユーザー
- UGS会員（一般会員）
- FPエイド
- マネージャー
- 運営（管理者）

### 主要な価値提案
1. **段階的な成長体験**: ロール別の昇格システムにより、明確な成長パスを提供
2. **シームレスな統合**: 教育、実践、報酬管理を1つのプラットフォームで完結
3. **実績ベースの報酬**: 契約実績や紹介実績に基づく透明性の高い報酬システム

---

## システム要件

### 技術スタック
- **フロントエンド**: Next.js 15, React 19, TypeScript, Tailwind CSS 4
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL (Supabase)
- **認証**: Supabase Auth
- **決済**: Stripe
- **ストレージ**: Supabase Storage
- **ORM**: Prisma

### 環境要件
- Node.js 18以上
- PostgreSQL 14以上
- ブラウザ: Chrome, Firefox, Safari, Edge（最新版）

---

## 機能要件

### 1. 認証・ユーザー管理

#### 1.1 ユーザー登録
- **機能**: 新規ユーザー登録
- **入力項目**: 
  - メールアドレス（必須）
  - パスワード（必須）
  - 名前（必須）
  - 紹介コード（任意）
- **処理**:
  - Supabaseでユーザー作成
  - Prismaでユーザープロファイル作成
  - 紹介コードが指定されている場合、紹介関係を自動登録
  - 紹介コードを自動生成（8文字）

#### 1.2 ログイン
- **機能**: ユーザーログイン
- **認証方式**: Supabase Auth（メール/パスワード）
- **処理**:
  - 認証成功後、ユーザープロファイルを取得
  - Prismaプロファイルが存在しない場合は自動作成
  - セッション管理

#### 1.3 パスワードリセット
- **機能**: パスワード忘れ時の再設定
- **処理**:
  - メールアドレス入力
  - リセットリンクをメール送信
  - リンクから新しいパスワードを設定

#### 1.4 ロール管理
- **機能**: ユーザーロールの管理
- **ロール**: MEMBER, FP, MANAGER, ADMIN
- **権限**: 管理者のみがロール変更可能

---

### 2. 教育システム

#### 2.1 コース一覧
- **機能**: コース一覧の表示
- **カテゴリ**: 
  - 所得を増やす（基礎編・実践編）
  - 生き方を豊かにする（基礎編・実践編）
  - スタートアップ支援（基礎編・実践編）
- **表示内容**: タイトル、説明、進捗状況

#### 2.2 レッスン閲覧
- **機能**: レッスンコンテンツの閲覧
- **コンテンツタイプ**: 
  - 動画（Vimeo）
  - PDF
- **進捗管理**: レッスン完了時に自動記録

#### 2.3 進捗管理
- **機能**: 学習進捗の追跡
- **表示内容**: 
  - コース別の完了率
  - レッスン別の完了状況
  - 最終学習日時

---

### 3. 昇格システム

#### 3.1 FPエイド昇格
- **昇格条件**:
  1. 基礎編テスト合格（70%以上）
  2. LP面談完了
  3. アンケート提出
  4. 身分証アップロード
  5. 業務委託契約書への同意
- **申請フロー**:
  1. 条件達成状況の確認
  2. 身分証のアップロード
  3. 業務委託契約書の確認と同意
  4. 昇格申請の送信
  5. 管理者による承認
- **承認後**: 
  - ユーザーロールが`FP`に更新
  - SupabaseとPrismaの両方で更新
  - 通知を送信

#### 3.2 マネージャー昇格
- **昇格条件**:
  1. 報酬実績: 直近3ヶ月の平均報酬が70,000円以上
  2. UGS会員紹介: 6ヶ月間に8名以上
  3. FPエイド紹介: 6ヶ月間に4名以上
  4. 契約実績: 直近20件の保険契約達成
- **申請フロー**:
  1. 条件達成状況の確認
  2. 昇格申請の送信
  3. 管理者による承認
- **承認後**: 
  - ユーザーロールが`MANAGER`に更新
  - 通知を送信

#### 3.3 昇格可能性チェック
- **機能**: リアルタイムで昇格可能性をチェック
- **表示内容**: 
  - 各条件の達成状況
  - 進捗バー
  - 不足している条件の明示

---

### 4. 基礎テスト・アンケート

#### 4.1 基礎テスト
- **機能**: FPエイド昇格条件の基礎編テスト
- **仕様**:
  - 問題数: 10問
  - 合格基準: 70%以上（7問以上正解）
  - 制限時間: なし
  - 再受験: 合格するまで何度でも可能
- **処理**:
  - 合格時に`FPPromotionApplication.basicTestCompleted`を更新
  - テスト結果を保存

#### 4.2 アンケート
- **機能**: FPエイド昇格条件のアンケート
- **仕様**:
  - 設問数: 10問
  - 提出: 1回のみ
- **処理**:
  - 提出時に`FPPromotionApplication.surveyCompleted`を更新
  - 回答を保存

---

### 5. LP面談機能

#### 5.1 LP面談申請（会員）
- **機能**: 会員がLP面談を申請
- **入力項目**:
  - 希望日時: 5つの候補日時
- **制約**:
  - 1人1回のみ申請可能（REQUESTED, SCHEDULED, COMPLETED状態の場合は再申請不可）
  - CANCELLED, NO_SHOW状態の場合は再申請可能
- **処理**:
  - LP面談レコードを作成
  - 管理者に通知を送信

#### 5.2 LP面談スケジュール（管理者）
- **機能**: 管理者がLP面談をスケジュール
- **入力項目**:
  - 希望日時から1つを選択
  - FPエイドを選択
  - 会議プラットフォーム（Zoom, Google Meet, Teams, その他）
  - 会議URL
- **処理**:
  - LP面談のステータスを`SCHEDULED`に更新
  - 会員とFPエイドの両方に通知を送信

#### 5.3 LP面談完了（FPエイド）
- **機能**: FPエイドがLP面談を完了
- **処理**:
  - LP面談のステータスを`COMPLETED`に更新
  - `FPPromotionApplication.lpMeetingCompleted`を更新
  - 会員に通知を送信

---

### 6. 紹介管理機能

#### 6.1 紹介コード
- **機能**: ユーザーごとの紹介コードを生成・表示
- **仕様**:
  - 8文字のユニークなコード
  - ユーザー登録時に自動生成
- **表示内容**:
  - 紹介コード
  - 紹介リンク（`/register?ref={紹介コード}`）

#### 6.2 紹介登録
- **機能**: 紹介関係の自動登録
- **トリガー**: 
  - 新規ユーザーが紹介コード付きで登録・決済完了
- **処理**:
  - 紹介関係を`PENDING`ステータスで作成
  - 紹介タイプを自動判定（MEMBERまたはFP）

#### 6.3 紹介承認（管理者）
- **機能**: 管理者が紹介を承認・却下
- **処理**:
  - 紹介ステータスを`APPROVED`または`REJECTED`に更新
  - **注意**: 紹介報酬は現在無効化されています

#### 6.4 紹介一覧
- **機能**: 自分の紹介実績を確認
- **表示内容**:
  - 総紹介数
  - UGS会員紹介数
  - FPエイド紹介数
  - 各紹介の詳細（名前、メール、タイプ、ステータス、日時）

---

### 7. 契約管理機能

#### 7.1 契約登録
- **機能**: FPエイド以上が契約実績を登録
- **入力項目**:
  - 契約番号（必須、ユニーク）
  - 契約タイプ（保険契約 / その他）
  - 契約日（必須）
  - 契約金額（任意）
  - 報酬額（任意）
- **処理**:
  - 契約レコードを作成
  - ステータスを`ACTIVE`に設定

#### 7.2 契約一覧
- **機能**: 登録した契約の一覧表示
- **表示内容**:
  - 契約番号
  - 契約タイプ
  - 契約日
  - 契約金額
  - 報酬額
  - ステータス（有効 / 解約 / 期限切れ）

#### 7.3 契約統計
- **機能**: 契約実績の統計表示
- **表示内容**:
  - 有効契約数
  - 総契約数
  - 契約報酬合計

---

### 8. 報酬管理機能

#### 8.1 報酬計算（管理者）
- **機能**: 月次報酬の自動計算
- **計算項目**:
  - 契約報酬
  - ボーナス
  - 控除
- **注意**: 紹介報酬は現在無効化されています

#### 8.2 報酬生成（管理者）
- **機能**: 指定月の報酬を生成
- **入力**: 対象月（YYYY-MM形式）
- **処理**:
  - 各ユーザーの報酬を計算
  - 報酬レコードを作成（ステータス: `PENDING`）

#### 8.3 報酬承認（管理者）
- **機能**: 生成された報酬を承認
- **処理**:
  - 報酬ステータスを`CONFIRMED`に更新
  - ユーザーに通知を送信

#### 8.4 報酬支払い（管理者）
- **機能**: 承認済み報酬を支払い済みにする
- **処理**:
  - 報酬ステータスを`PAID`に更新
  - ユーザーに通知を送信

#### 8.5 報酬ダッシュボード（FPエイド以上）
- **機能**: 自分の報酬を確認
- **表示内容**:
  - 今月の報酬
  - 先月の報酬
  - 累計報酬
  - 報酬内訳
  - マネージャー昇格条件の進捗（FPエイドのみ）

---

### 9. イベント管理機能

#### 9.1 イベント一覧
- **機能**: イベント一覧の表示
- **表示内容**:
  - イベント名
  - 日時
  - 場所（オンライン/オフライン）
  - タイプ（必須 / 任意 / マネージャー限定）
  - 登録状況
  - ステータス（開催予定 / 終了 / キャンセル）

#### 9.2 イベント登録（会員）
- **機能**: イベントへの参加登録・キャンセル
- **処理**:
  - イベント登録レコードを作成/削除
  - 定員に達している場合は登録不可

#### 9.3 イベント作成（管理者）
- **機能**: 管理者がイベントを作成
- **入力項目**:
  - イベント名（必須）
  - 説明（任意）
  - 日時（必須）
  - タイプ（必須 / 任意 / マネージャー限定）
  - オンライン/オフライン（デフォルト: オンライン）
  - 場所（オフラインの場合）
  - 最大参加者数（任意）

#### 9.4 イベント削除（管理者）
- **機能**: 管理者がイベントを削除
- **処理**:
  - イベントと関連する登録を削除

---

### 10. 通知機能

#### 10.1 通知一覧
- **機能**: ユーザーへの通知一覧表示
- **表示内容**:
  - 未読通知（上部）
  - 既読通知（下部）
  - 通知タイプ
  - 優先度（重要 / 情報 / 成功）
  - 日時

#### 10.2 通知の種類
- **昇格関連**: 昇格申請の承認・却下、昇格条件達成
- **報酬関連**: 報酬の準備完了、報酬の支払い完了
- **イベント関連**: イベントのリマインダー、必須イベントの通知
- **紹介関連**: 紹介の承認・却下
- **契約関連**: 契約達成の通知
- **LP面談関連**: LP面談の申請、スケジュール、完了
- **その他**: アクションが必要な通知

#### 10.3 通知管理
- **機能**: 通知の既読管理
- **操作**:
  - 個別に既読にする
  - すべて既読にする
- **処理**:
  - `isRead`フラグを更新
  - `readAt`タイムスタンプを記録

---

### 11. 決済機能

#### 11.1 Stripe統合
- **機能**: Stripe Checkoutによる決済
- **処理**:
  - Checkoutセッションを作成
  - 決済完了後、Webhookで処理
  - サブスクリプションを登録
  - 月額料金: ¥5,500/月

#### 11.2 サブスクリプション管理
- **機能**: サブスクリプションの状態管理
- **状態**: ACTIVE, CANCELED, PAST_DUE, UNPAID
- **処理**:
  - Stripe Webhookで状態を自動更新
  - 決済完了時にユーザー登録を完了
  - 月次決済の自動処理

#### 11.3 ユーザー側サブスクリプション管理
- **機能**: ユーザーが自分のサブスクリプションを管理
- **場所**: `/dashboard/settings/subscription`
- **機能詳細**:
  - サブスクリプション状態の表示（有効、未払い、キャンセル済み）
  - 月額料金・期間の表示
  - 次回請求日の表示
  - カード情報の表示・変更（Stripe Customer Portal連携）
  - サブスクリプションのキャンセル（期間終了時にキャンセル）
  - サブスクリプションの再開
  - 請求履歴の表示（最大12件）
  - 請求書PDFのダウンロード

#### 11.4 決済失敗処理
- **機能**: 決済失敗時の自動処理
- **処理**:
  - Webhookで `invoice.payment_failed` イベントを受信
  - サブスクリプション状態を `PAST_DUE` に更新
  - ユーザーに決済失敗メールを送信
  - カード情報更新へのリンクを含む

#### 11.5 キャンセル処理
- **機能**: サブスクリプションキャンセル時の処理
- **処理**:
  - Webhookで `customer.subscription.deleted` イベントを受信
  - サブスクリプション状態を `CANCELED` に更新
  - ユーザーにキャンセル確認メールを送信
  - 再開へのリンクを含む

#### 11.6 アクセス制限
- **機能**: 未払い・キャンセル時のアクセス制限
- **制限対象状態**: PAST_DUE, UNPAID, CANCELED
- **処理**:
  - ダッシュボードアクセス時にサブスクリプション状態をチェック
  - 制限対象状態の場合、アクセスをブロック
  - サブスクリプション管理ページへのリダイレクトを案内
  - 管理者は常にアクセス可能
  - 設定ページ（`/dashboard/settings/*`）は常にアクセス可能

#### 11.7 紹介コード連携
- **機能**: 決済時の紹介コード処理
- **処理**:
  - 決済完了時に紹介コードが指定されていれば紹介関係を自動登録

---

## 非機能要件

### パフォーマンス
- ページ読み込み時間: 3秒以内
- API応答時間: 1秒以内
- データベースクエリ: 最適化されたインデックス使用

### セキュリティ
- 認証: Supabase Authによるセキュアな認証
- 権限チェック: すべてのAPIエンドポイントで実装
- データ保護: RLS（Row Level Security）ポリシー
- HTTPS: 本番環境では必須

### 可用性
- 稼働率: 99%以上
- エラーハンドリング: 適切なエラーメッセージ表示
- ログ: 重要な操作のログ記録

### スケーラビリティ
- データベース: 接続プーリング対応
- ストレージ: Supabase Storage使用
- CDN: Vercel Edge Network使用

---

## データモデル

### 主要なエンティティ

#### User（ユーザー）
- `id`: ユーザーID
- `email`: メールアドレス（ユニーク）
- `name`: 名前
- `role`: ロール（MEMBER, FP, MANAGER, ADMIN）
- `referralCode`: 紹介コード（ユニーク）
- `bankAccount`: 振込口座情報（JSON）

#### Referral（紹介）
- `id`: 紹介ID
- `referrerId`: 紹介者ID
- `referredId`: 被紹介者ID
- `referralType`: 紹介タイプ（MEMBER, FP）
- `status`: ステータス（PENDING, APPROVED, REJECTED, REWARDED）
- `rewardAmount`: 報酬金額（現在は使用しない）

#### Contract（契約）
- `id`: 契約ID
- `userId`: ユーザーID
- `contractNumber`: 契約番号（ユニーク）
- `contractType`: 契約タイプ（INSURANCE, OTHER）
- `status`: ステータス（ACTIVE, CANCELLED, EXPIRED）
- `signedAt`: 契約日
- `amount`: 契約金額
- `rewardAmount`: 報酬金額

#### Compensation（報酬）
- `id`: 報酬ID
- `userId`: ユーザーID
- `month`: 対象月（YYYY-MM）
- `amount`: 報酬総額
- `breakdown`: 報酬内訳（JSON）
- `status`: ステータス（PENDING, CONFIRMED, PAID）

#### FPPromotionApplication（FP昇格申請）
- `id`: 申請ID
- `userId`: ユーザーID（ユニーク）
- `status`: ステータス（PENDING, APPROVED, REJECTED, COMPLETED）
- `lpMeetingCompleted`: LP面談完了フラグ
- `basicTestCompleted`: 基礎テスト合格フラグ
- `surveyCompleted`: アンケート提出フラグ
- `idDocumentUrl`: 身分証URL

#### LPMeeting（LP面談）
- `id`: LP面談ID
- `memberId`: 会員ID（ユニーク）
- `fpId`: FPエイドID
- `status`: ステータス（REQUESTED, SCHEDULED, COMPLETED, CANCELLED, NO_SHOW）
- `preferredDates`: 希望日時（JSON配列、5つ）
- `scheduledAt`: スケジュール日時
- `meetingUrl`: 会議URL
- `meetingPlatform`: 会議プラットフォーム

#### BasicTest（基礎テスト）
- `id`: テストID
- `title`: タイトル
- `questions`: 問題（JSON配列）
- `passingScore`: 合格点（デフォルト: 70%）

#### BasicTestResult（基礎テスト結果）
- `id`: 結果ID
- `userId`: ユーザーID
- `testId`: テストID
- `score`: 得点（%）
- `answers`: 回答（JSON配列）
- `isPassed`: 合格フラグ

#### Survey（アンケート）
- `id`: アンケートID
- `title`: タイトル
- `questions`: 設問（JSON配列）

#### SurveySubmission（アンケート提出）
- `id`: 提出ID
- `userId`: ユーザーID
- `surveyId`: アンケートID
- `answers`: 回答（JSON配列）

#### Notification（通知）
- `id`: 通知ID
- `userId`: ユーザーID
- `type`: 通知タイプ
- `priority`: 優先度（CRITICAL, INFO, SUCCESS）
- `title`: タイトル
- `message`: メッセージ
- `actionUrl`: アクションURL
- `isRead`: 既読フラグ

---

## ユーザーロールと権限

### ロール定義

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
| 基礎テスト受験 | ✅ | ❌ | ❌ | ❌ |
| アンケート提出 | ✅ | ❌ | ❌ | ❌ |
| LP面談申請 | ✅ | ❌ | ❌ | ❌ |
| FPエイド昇格申請 | ✅ | ❌ | ❌ | ❌ |
| 紹介管理 | ❌ | ✅ | ✅ | ✅ |
| 契約管理 | ❌ | ✅ | ✅ | ✅ |
| 報酬管理（閲覧） | ❌ | ✅ | ✅ | ✅ |
| イベント登録 | ✅ | ✅ | ✅ | ✅ |
| マネージャー昇格申請 | ❌ | ✅ | ❌ | ❌ |
| LP面談管理（FP） | ❌ | ✅ | ❌ | ❌ |
| 必須イベント管理 | ❌ | ❌ | ✅ | ✅ |
| ユーザー管理 | ❌ | ❌ | ❌ | ✅ |
| サブスクリプション管理（ユーザー側） | ✅ | ✅ | ✅ | ✅ |
| サブスクリプション管理（管理者側） | ❌ | ❌ | ❌ | ✅ |
| 報酬計算・承認 | ❌ | ❌ | ❌ | ✅ |
| 昇格承認 | ❌ | ❌ | ❌ | ✅ |
| イベント作成・削除 | ❌ | ❌ | ❌ | ✅ |
| LP面談スケジュール | ❌ | ❌ | ❌ | ✅ |
| 基礎テスト・アンケート管理 | ❌ | ❌ | ❌ | ✅ |

---

## API仕様

### 認証API
- `POST /api/auth/create-profile` - ユーザープロファイル作成
- `GET /api/auth/profile/[userId]` - ユーザープロファイル取得
- `POST /api/auth/reset-password` - パスワードリセット

### 紹介API
- `GET /api/referrals?userId={userId}` - 紹介一覧取得
- `POST /api/referrals` - 紹介登録（通常は自動）
- `POST /api/referrals/register` - 紹介コードを使用して紹介を登録
- `POST /api/referrals/[referralId]/approve` - 紹介を承認（管理者）
- `POST /api/referrals/[referralId]/reject` - 紹介を却下（管理者）

### 契約API
- `GET /api/contracts?userId={userId}` - 契約一覧取得
- `POST /api/contracts` - 契約登録
- `PUT /api/contracts/[contractId]` - 契約更新
- `DELETE /api/contracts/[contractId]` - 契約削除

### 報酬API（管理者）
- `POST /api/admin/compensations/generate` - 月次報酬を生成
- `POST /api/admin/compensations/[compensationId]/approve` - 報酬を承認
- `POST /api/admin/compensations/[compensationId]/pay` - 報酬を支払い済みにする

### 昇格API
- `GET /api/promotions/eligibility?userId={userId}&targetRole={role}` - 昇格可能性をチェック
- `POST /api/promotions/apply` - 昇格申請を送信
- `POST /api/user/upload-id-document` - 身分証をアップロード（FP昇格用）
- `GET /api/user/get-id-document-url?userId={userId}` - アップロードした身分証のURLを取得
- `GET /api/user/fp-promotion-application?userId={userId}` - FP昇格申請情報を取得
- `GET /api/user/contract-url` - 業務委託契約書のURLを取得
- `POST /api/user/fp-promotion-apply` - FPエイド昇格申請を送信
- `POST /api/admin/promotions/[applicationId]/approve` - 昇格申請を承認（管理者）
- `POST /api/admin/promotions/[applicationId]/reject` - 昇格申請を却下（管理者）

### 基礎テストAPI
- `GET /api/basic-test` - 基礎テストを取得
- `POST /api/basic-test` - 基礎テストを提出
- `GET /api/admin/basic-test` - 基礎テスト一覧取得（管理者）
- `POST /api/admin/basic-test` - 基礎テストを作成・更新（管理者）

### アンケートAPI
- `GET /api/survey` - アンケートを取得
- `POST /api/survey` - アンケートを提出
- `GET /api/admin/survey` - アンケート一覧取得（管理者）
- `POST /api/admin/survey` - アンケートを作成・更新（管理者）

### LP面談API
- `POST /api/lp-meetings/request` - LP面談を申請（会員）
- `GET /api/lp-meetings/my-meeting` - 自分のLP面談状況を取得（会員）
- `GET /api/admin/lp-meetings` - LP面談一覧取得（管理者）
- `POST /api/admin/lp-meetings/[meetingId]/schedule` - LP面談をスケジュール（管理者）
- `GET /api/lp-meetings/my-scheduled` - 自分のスケジュール済みLP面談を取得（FPエイド）
- `POST /api/lp-meetings/[meetingId]/complete` - LP面談を完了（FPエイド）

### イベントAPI
- `GET /api/events` - イベント一覧取得
- `POST /api/events/register` - イベントに登録・キャンセル
- `POST /api/admin/events` - イベントを作成（管理者）
- `DELETE /api/admin/events/[eventId]` - イベントを削除（管理者）

### 通知API
- `GET /api/notifications?userId={userId}` - 通知一覧を取得
- `POST /api/notifications` - 通知を作成（システム内部）
- `POST /api/notifications/[notificationId]/read` - 通知を既読にする
- `POST /api/notifications/mark-all-read` - すべての通知を既読にする

### 決済API
- `POST /api/create-checkout-session` - Stripe Checkoutセッションを作成
- `POST /api/webhooks/stripe` - Stripe Webhook処理
  - `checkout.session.completed` - 決済完了処理
  - `invoice.payment_succeeded` - 月次決済成功処理
  - `invoice.payment_failed` - 決済失敗処理
  - `customer.subscription.deleted` - キャンセル処理
- `GET /api/user/subscription` - ユーザーのサブスクリプション情報を取得
- `POST /api/user/subscription/cancel` - サブスクリプションをキャンセル
- `POST /api/user/subscription/reactivate` - サブスクリプションを再開
- `POST /api/user/subscription/update-payment-method` - カード情報更新用のCustomer Portalセッションを作成
- `GET /api/user/subscription/invoices` - 請求履歴を取得

---

## UI/UX要件

### デザインシステム
- **カラーパレット**: Slate (900/800/700/600/500)
- **背景色**: Slate (50/100)
- **フォント**: Inter（Google Fonts）
- **角丸**: Card (16px), Button (12px)
- **シャドウ**: Card (shadow-lg), Hover (shadow-2xl)
- **アニメーション**: 300ms ease-in-out

### レスポンシブ対応
- **デスクトップ**: フルサイドバー + メインコンテンツ
- **タブレット**: 折りたたみ可能なサイドバー
- **モバイル**: ハンバーガーメニュー + オーバーレイ

### アクセシビリティ
- キーボードナビゲーション対応
- スクリーンリーダー対応
- コントラスト比の確保

---

## 統合要件

### Stripe統合
- Checkoutセッション作成
- Webhook処理
- サブスクリプション管理
- 決済完了時の処理

### Supabase統合
- 認証（Supabase Auth）
- データベース（PostgreSQL）
- ストレージ（Supabase Storage）
- RLS（Row Level Security）

### メール送信
- 決済完了通知
- 決済失敗通知（カード情報更新への案内）
- サブスクリプションキャンセル通知（再開への案内）
- パスワードリセット
- LP面談スケジュール通知
- 昇格承認通知

---

## 制約事項

### 紹介報酬
- **現在の状態**: 紹介報酬は無効化されています
- **理由**: 要件変更により報酬システムから除外
- **影響**: 
  - 紹介承認時に報酬金額を設定しない
  - 報酬計算に紹介報酬を含めない
  - UIから報酬額の表示を削除

### データベース接続
- Supabase接続プーリングを使用
- 接続エラー時の適切なエラーハンドリング
- 503エラーでユーザーフレンドリーなメッセージを表示

---

## 今後の拡張予定

### Phase 3（将来実装）
- チーム管理機能
- 分析ダッシュボード
- CSV出力
- QRコード発行
- 学習ポイント連携

---

## 更新履歴

- **2025年1月**: 要件定義書作成
- **2025年1月**: 紹介報酬無効化

---

**最終更新**: 2025年1月

