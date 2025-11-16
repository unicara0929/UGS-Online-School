# UGSオンラインスクール プラットフォーム

「学び → 実践 → 自立」を一体化したFP育成プラットフォーム

## 🎯 プロジェクト概要

UGSオンラインスクールは、教育・昇格・報酬管理・イベント運営を1つのUXで完結するFP育成プラットフォームです。シームレスな成長体験を提供し、ユーザーが段階的にスキルアップできる仕組みを構築しています。

## ✨ 主な機能

### 🔐 認証・ロール管理
- 4つのロール（UGS会員、FPエイド、マネージャー、運営）
- ロール別のアクセス権限管理
- セキュアな認証システム

### 📚 教育システム
- **3カテゴリ × 2レベル = 6コンテンツ群**
  - 所得を増やす（基礎編・実践編）
  - 生き方を豊かにする（基礎編・実践編）
  - スタートアップ支援（基礎編・実践編）
- 進捗管理とロック機能
- 動画・PDF教材の配信

### 🏆 昇格システム
- **FPエイド昇格**
  - 昇格条件
    - 基礎編テスト合格
    - LP面談完了
    - アンケート提出
  - 申請機能と管理者承認フロー
  - 申請履歴の確認

- **マネージャー昇格**
  - 昇格条件の自動判定
    - 報酬実績（直近3ヶ月平均70,000円以上）
    - 紹介実績（UGS会員8名以上、FPエイド4名以上）
    - 契約実績（直20被保達成）
  - ワンクリック申請機能
  - 管理者承認・却下機能（理由付き）
  - 申請履歴の確認と通知

### 💰 報酬管理
- リアルタイム報酬ダッシュボード
- 詳細な報酬明細（PDF・CSV出力）
- 振込口座管理
- 昇格条件の可視化

### 📅 イベント管理
- 月初MTG（必須参加）
- 任意イベント・マネージャー限定イベント
- 出欠管理と代替対応

### 🔔 通知システム
- アクション必須通知（高優先度）
- 情報通知（通常）
- 達成通知（成功）
- 昇格申請の承認・却下通知
- 次に取るべきアクションの明示
- 既読・未読管理

### 👨‍💼 管理者機能
- **昇格申請管理**
  - FPエイド・マネージャー昇格申請の一括管理
  - タブ形式での分離表示
  - 承認・却下処理（理由付き）
- **報酬管理**
  - 月次報酬の自動生成
  - 報酬の承認・支払い管理
- **イベント管理**
  - イベントの作成・編集・削除
  - 参加者管理
- **ユーザー管理**
  - ロール変更
  - アカウント管理
- **教材管理**
  - 教材のアップロード・管理
  - 閲覧権限設定

## 🎨 デザインシステム

### カラーパレット
- **Primary**: Slate (900/800/700/600/500)
- **Background**: Slate (50/100)
- **White**: #FFFFFF
- **Accent**: Slate (700) for CTAs

### タイポグラフィ
- **Font**: Inter（Google Fonts）
- **Heading**: Inter 800 (extra bold), letter-spacing: -0.03em
- **Subheading**: Inter 700 (bold), letter-spacing: -0.02em
- **Body**: Inter 400 (regular), letter-spacing: 0.01em
- **Caption**: Inter 300 (light), letter-spacing: 0.02em

### UI要素
- **角丸**: Card (16px), Button (12px)
- **シャドウ**: Card (shadow-lg), Hover (shadow-2xl)
- **アニメーション**: 300ms ease-in-out, hover scale 1.05

## 🚀 技術スタック

### フロントエンド
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Components**: Radix UI + shadcn/ui + カスタムコンポーネント

### バックエンド
- **Runtime**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage

### 開発ツール
- **Package Manager**: npm
- **Build Tool**: Turbopack
- **Code Quality**: TypeScript, ESLint
- **Database Management**: Prisma Studio

## 📦 インストール・セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn

### セットアップ手順

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd school
```

2. **依存関係のインストール**
```bash
npm install
```

3. **開発サーバーの起動**
```bash
npm run dev
```

4. **ブラウザでアクセス**
```
http://localhost:3000
```

## 🔑 デモアカウント

以下のアカウントでログインして各ロールの機能を体験できます：

| ロール | メールアドレス | パスワード |
|--------|----------------|------------|
| UGS会員 | member@example.com | 123 |
| FPエイド | fp@example.com | 123 |
| マネージャー | manager@example.com | 123 |
| 運営 | admin@example.com | 123 |

## 📱 レスポンシブ対応

- **デスクトップ**: フルサイドバー + メインコンテンツ
- **タブレット**: 折りたたみ可能なサイドバー
- **モバイル**: ハンバーガーメニュー + オーバーレイ

## 🗂️ プロジェクト構造

```
src/
├── app/                           # Next.js App Router
│   ├── api/                      # APIルート
│   │   ├── admin/               # 管理者用API
│   │   │   ├── compensations/  # 報酬管理
│   │   │   ├── events/         # イベント管理
│   │   │   ├── promotions/     # 昇格申請管理
│   │   │   └── materials/      # 教材管理
│   │   ├── promotions/         # 昇格関連API
│   │   ├── compensations/      # 報酬API
│   │   └── events/             # イベントAPI
│   ├── dashboard/              # ダッシュボードページ
│   │   ├── admin/             # 管理者画面
│   │   ├── promotion/         # 昇格管理
│   │   ├── compensation/      # 報酬管理
│   │   └── events/            # イベント管理
│   ├── login/                 # ログインページ
│   └── layout.tsx             # ルートレイアウト
├── components/                # Reactコンポーネント
│   ├── auth/                 # 認証関連
│   ├── ui/                   # 基本UIコンポーネント (shadcn/ui)
│   ├── dashboard/            # ダッシュボード
│   ├── promotion/            # 昇格関連
│   ├── admin/                # 管理者コンポーネント
│   └── navigation/           # ナビゲーション
├── contexts/                 # React Context (認証など)
├── lib/                      # ユーティリティ・サービス
│   ├── services/            # ビジネスロジック
│   ├── auth/                # 認証ヘルパー
│   └── utils/               # ユーティリティ関数
└── prisma/                   # Prismaスキーマ・マイグレーション
```

## 🔄 開発フロー

### 主要な開発フェーズ

1. **Phase 1 (MVP)** ✅
   - ユーザー認証・ロール管理
   - ダッシュボード（4ロール別）
   - 教材閲覧機能（基礎編）
   - 成長フロー可視化
   - FPエイド昇格機能

2. **Phase 2** ✅
   - 実践編教材解放
   - FP昇格後ガイダンス
   - 報酬管理機能（月次報酬生成、承認、支払い管理）
   - イベント機能（基本）
   - 月初MTG管理
   - マネージャー昇格機能（条件判定、申請、管理者承認・却下）
   - 昇格申請履歴表示
   - 通知システム統合

3. **Phase 3** (将来実装)
   - チーム管理機能
   - 分析ダッシュボード
   - CSV出力
   - QRコード発行
   - 学習ポイント連携

## 🎯 今後の拡張予定

- **決済システム**: Stripe統合 ✅ (実装済み)
- **ファイルストレージ**: Supabase Storage統合 ✅ (実装済み)
- **チーム管理**: ダウンライン管理、ツリー表示
- **分析ダッシュボード**: 詳細なKPI・レポート機能
- **CSV/PDFエクスポート**: 報酬明細、申請履歴の出力
- **リアルタイム通知**: プッシュ通知対応
- **モバイルアプリ**: React Native対応

## 📄 ライセンス

このプロジェクトは私的使用目的で開発されています。

## 🤝 コントリビューション

プロジェクトへの貢献を歓迎します。プルリクエストやイシューの報告をお気軽にお願いします。

---

**UGSオンラインスクール** - 学び → 実践 → 自立を一体化したFP育成プラットフォーム# UGS-Online-School
# UGS-Online-School
# UGS-Online-School
