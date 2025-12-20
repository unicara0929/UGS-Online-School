import { PrismaClient, CourseCategory, CourseLevel } from '@prisma/client'

const prisma = new PrismaClient()

// 仮のVimeo URL（後で管理者が実際のURLに更新する）
const PLACEHOLDER_VIMEO_URL = 'https://vimeo.com/placeholder'

interface LessonData {
  title: string
  description: string
  duration: number
  order: number
  videoUrl: string
}

interface CourseData {
  title: string
  description: string
  category: CourseCategory
  level: CourseLevel
  isLocked: boolean
  order: number
  lessons: LessonData[]
}

const coursesData: CourseData[] = [
  // ========================================
  // カテゴリー1: 所得を増やすマネーリテラシー全般
  // ========================================

  // 基礎編
  {
    title: 'ライフプランニング',
    description: '人生設計とお金の計画について学ぶ',
    category: 'MONEY_LITERACY',
    level: 'BASIC',
    isLocked: false,
    order: 1,
    lessons: [
      { title: 'ライフプランニングとは', description: '人生設計の基本', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '目標設定の方法', description: '具体的な目標の立て方', duration: 480, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '老後資金',
    description: '老後に必要な資金について学ぶ',
    category: 'MONEY_LITERACY',
    level: 'BASIC',
    isLocked: false,
    order: 2,
    lessons: [
      { title: '老後資金の必要額', description: 'いくら必要かを計算', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '年金制度の理解', description: '公的年金の仕組み', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '保険選び',
    description: '自分に合った保険の選び方',
    category: 'MONEY_LITERACY',
    level: 'BASIC',
    isLocked: false,
    order: 3,
    lessons: [
      { title: '保険の種類', description: '生命保険・損害保険の違い', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '必要保障額の計算', description: '自分に必要な保障を知る', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '住宅',
    description: '住宅購入と資金計画',
    category: 'MONEY_LITERACY',
    level: 'BASIC',
    isLocked: false,
    order: 4,
    lessons: [
      { title: '住宅ローンの基礎', description: 'ローンの仕組みと選び方', duration: 720, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '住宅購入のタイミング', description: '購入時期の見極め方', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '転職',
    description: '転職とキャリアアップ',
    category: 'MONEY_LITERACY',
    level: 'BASIC',
    isLocked: false,
    order: 5,
    lessons: [
      { title: '転職市場の理解', description: '転職市場の動向', duration: 540, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'キャリア形成の考え方', description: '長期的なキャリア戦略', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '投資基礎',
    description: '投資の基本を学ぶ',
    category: 'MONEY_LITERACY',
    level: 'BASIC',
    isLocked: false,
    order: 6,
    lessons: [
      { title: '投資とは何か', description: '投資の本質を理解', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'リスクとリターン', description: 'リスク管理の基本', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '節税',
    description: '合法的な節税方法',
    category: 'MONEY_LITERACY',
    level: 'BASIC',
    isLocked: false,
    order: 7,
    lessons: [
      { title: '所得税の仕組み', description: '所得税の計算方法', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '控除制度の活用', description: '各種控除の活用方法', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '相続',
    description: '相続の基本知識',
    category: 'MONEY_LITERACY',
    level: 'BASIC',
    isLocked: false,
    order: 8,
    lessons: [
      { title: '相続税の基礎', description: '相続税の仕組み', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '相続対策の基本', description: '事前準備の重要性', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },

  // 応用編
  {
    title: 'FXトレード',
    description: 'FX取引の応用知識',
    category: 'MONEY_LITERACY',
    level: 'ADVANCED',
    isLocked: false,
    order: 9,
    lessons: [
      { title: 'FXの仕組み', description: '為替取引の基本', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'テクニカル分析', description: 'チャート分析の方法', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '株式投資',
    description: '株式投資の実践',
    category: 'MONEY_LITERACY',
    level: 'ADVANCED',
    isLocked: false,
    order: 10,
    lessons: [
      { title: '株式市場の理解', description: '株式市場の仕組み', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '銘柄選定の方法', description: '投資先の選び方', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '経営者保険',
    description: '経営者向け保険活用',
    category: 'MONEY_LITERACY',
    level: 'ADVANCED',
    isLocked: false,
    order: 11,
    lessons: [
      { title: '経営者保険の種類', description: '各種保険の特徴', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '保険を活用した節税', description: '保険料の経費化', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '法人決算書',
    description: '決算書の読み方',
    category: 'MONEY_LITERACY',
    level: 'ADVANCED',
    isLocked: false,
    order: 12,
    lessons: [
      { title: '貸借対照表の読み方', description: 'B/Sの理解', duration: 720, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '損益計算書の読み方', description: 'P/Lの理解', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '家族信託',
    description: '家族信託の活用',
    category: 'MONEY_LITERACY',
    level: 'ADVANCED',
    isLocked: false,
    order: 13,
    lessons: [
      { title: '家族信託とは', description: '家族信託の仕組み', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '活用事例', description: '具体的な活用方法', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'その他事例',
    description: '様々な資産運用事例',
    category: 'MONEY_LITERACY',
    level: 'ADVANCED',
    isLocked: false,
    order: 14,
    lessons: [
      { title: '不動産投資事例', description: '不動産投資の実例', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '税務調査対応', description: '税務調査への備え', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },

  // ========================================
  // カテゴリー2: 実践スキル
  // ========================================

  // 基礎編
  {
    title: 'テレアポ',
    description: 'テレアポの基本スキル',
    category: 'PRACTICAL_SKILL',
    level: 'BASIC',
    isLocked: true,
    order: 1,
    lessons: [
      { title: 'テレアポの心構え', description: '電話営業の基本姿勢', duration: 540, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'トークスクリプト', description: '効果的な話し方', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'タイプ別理解',
    description: '顧客タイプ別対応',
    category: 'PRACTICAL_SKILL',
    level: 'BASIC',
    isLocked: true,
    order: 2,
    lessons: [
      { title: '顧客タイプの分類', description: 'タイプ別特徴', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'タイプ別対応法', description: '各タイプへの対応', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'ヒアリング',
    description: 'ヒアリングスキル',
    category: 'PRACTICAL_SKILL',
    level: 'BASIC',
    isLocked: true,
    order: 3,
    lessons: [
      { title: 'ヒアリングの基本', description: '傾聴スキル', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '質問技法', description: '効果的な質問の仕方', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '時間管理',
    description: '効率的な時間管理',
    category: 'PRACTICAL_SKILL',
    level: 'BASIC',
    isLocked: true,
    order: 4,
    lessons: [
      { title: '時間管理の原則', description: '時間の使い方', duration: 540, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'スケジュール管理', description: '予定の組み方', duration: 480, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'マインドセット',
    description: '成功するマインド',
    category: 'PRACTICAL_SKILL',
    level: 'BASIC',
    isLocked: true,
    order: 5,
    lessons: [
      { title: '成功者の考え方', description: '成功マインドの構築', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'メンタル管理', description: '心の安定を保つ', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'プレゼンテーション',
    description: 'プレゼンスキル',
    category: 'PRACTICAL_SKILL',
    level: 'BASIC',
    isLocked: true,
    order: 6,
    lessons: [
      { title: 'プレゼンの構成', description: '効果的な構成方法', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '話し方のコツ', description: '伝わる話し方', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'クロージング',
    description: 'クロージング技術',
    category: 'PRACTICAL_SKILL',
    level: 'BASIC',
    isLocked: true,
    order: 7,
    lessons: [
      { title: 'クロージングの基本', description: '契約への導き方', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '反論処理', description: '反論への対応', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'フォローアップ',
    description: 'アフターフォロー',
    category: 'PRACTICAL_SKILL',
    level: 'BASIC',
    isLocked: true,
    order: 8,
    lessons: [
      { title: 'フォローの重要性', description: 'リピートにつなげる', duration: 480, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '紹介獲得の方法', description: '紹介をもらう技術', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '顧客管理',
    description: '顧客情報の管理',
    category: 'PRACTICAL_SKILL',
    level: 'BASIC',
    isLocked: true,
    order: 9,
    lessons: [
      { title: '顧客情報の整理', description: 'データベース管理', duration: 480, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'CRM活用', description: 'ツールの使い方', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'コミュニケーション',
    description: 'コミュニケーション力',
    category: 'PRACTICAL_SKILL',
    level: 'BASIC',
    isLocked: true,
    order: 10,
    lessons: [
      { title: '信頼関係構築', description: '信頼を築く技術', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '非言語コミュニケーション', description: 'ボディランゲージ', duration: 480, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },

  // 応用編
  {
    title: 'メンタルブロック外し',
    description: '心理的障壁の克服',
    category: 'PRACTICAL_SKILL',
    level: 'ADVANCED',
    isLocked: true,
    order: 11,
    lessons: [
      { title: 'メンタルブロックとは', description: '心理的障壁の理解', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '克服方法', description: 'ブロック解除の技術', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '即決クロージング',
    description: '即決を引き出す技術',
    category: 'PRACTICAL_SKILL',
    level: 'ADVANCED',
    isLocked: true,
    order: 12,
    lessons: [
      { title: '即決の心理学', description: '決断を促す技術', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '即決トーク', description: '効果的なトーク術', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'オンライン面談術',
    description: 'オンライン商談の技術',
    category: 'PRACTICAL_SKILL',
    level: 'ADVANCED',
    isLocked: true,
    order: 13,
    lessons: [
      { title: 'オンライン面談の準備', description: '環境整備と準備', duration: 540, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'オンラインでの信頼構築', description: '画面越しの関係構築', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'チーム作り',
    description: 'チームビルディング',
    category: 'PRACTICAL_SKILL',
    level: 'ADVANCED',
    isLocked: true,
    order: 14,
    lessons: [
      { title: 'リーダーシップ', description: 'チームを率いる力', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'メンバー育成', description: '後輩指導の方法', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '研修用',
    description: '研修資料・ロープレ',
    category: 'PRACTICAL_SKILL',
    level: 'ADVANCED',
    isLocked: true,
    order: 15,
    lessons: [
      { title: 'ロールプレイング', description: '実践練習', duration: 900, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'フィードバック方法', description: '効果的なフィードバック', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },

  // ========================================
  // カテゴリー3: スタートアップ支援
  // ========================================

  // 基礎編
  {
    title: 'スタートアップ基礎ステップ1',
    description: 'スタートアップの第一歩',
    category: 'STARTUP_SUPPORT',
    level: 'BASIC',
    isLocked: true,
    order: 1,
    lessons: [
      { title: 'スタートアップとは', description: '起業の基本', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'アイデア発想法', description: 'ビジネスアイデアの見つけ方', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'スタートアップ基礎ステップ2',
    description: '事業計画の作成',
    category: 'STARTUP_SUPPORT',
    level: 'BASIC',
    isLocked: true,
    order: 2,
    lessons: [
      { title: '事業計画書の書き方', description: '計画書作成の基本', duration: 720, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '収支計画', description: '資金計画の立て方', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'スタートアップ基礎ステップ3',
    description: '法務・手続き',
    category: 'STARTUP_SUPPORT',
    level: 'BASIC',
    isLocked: true,
    order: 3,
    lessons: [
      { title: '会社設立手続き', description: '法人設立の流れ', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '許認可の取得', description: '必要な許可・届出', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'スタートアップ基礎ステップ4',
    description: 'マーケティング基礎',
    category: 'STARTUP_SUPPORT',
    level: 'BASIC',
    isLocked: true,
    order: 4,
    lessons: [
      { title: 'ターゲット設定', description: '顧客層の絞り込み', duration: 540, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'マーケティング戦略', description: '集客の基本', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'スタートアップ基礎ステップ5',
    description: '資金調達',
    category: 'STARTUP_SUPPORT',
    level: 'BASIC',
    isLocked: true,
    order: 5,
    lessons: [
      { title: '資金調達の方法', description: '融資・出資の選択', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '補助金・助成金', description: '公的支援の活用', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },

  // 応用編
  {
    title: 'スタートアップ応用ステップ1',
    description: 'スケールアップ戦略',
    category: 'STARTUP_SUPPORT',
    level: 'ADVANCED',
    isLocked: true,
    order: 6,
    lessons: [
      { title: '事業拡大の方法', description: 'グロース戦略', duration: 720, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '組織づくり', description: 'チーム拡大', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'スタートアップ応用ステップ2',
    description: '事業再構築',
    category: 'STARTUP_SUPPORT',
    level: 'ADVANCED',
    isLocked: true,
    order: 7,
    lessons: [
      { title: 'ピボット戦略', description: '方向転換の判断', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '事業の見直し', description: '改善と最適化', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'バスケ作り',
    description: '顧客基盤の構築',
    category: 'STARTUP_SUPPORT',
    level: 'ADVANCED',
    isLocked: true,
    order: 8,
    lessons: [
      { title: 'リスト構築', description: '見込み客リストの作成', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '顧客育成', description: 'ナーチャリング戦略', duration: 540, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'ロープレ実践',
    description: '実践ロールプレイング',
    category: 'STARTUP_SUPPORT',
    level: 'ADVANCED',
    isLocked: true,
    order: 9,
    lessons: [
      { title: 'ロープレの進め方', description: '効果的な練習方法', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'シナリオ別対応', description: '様々な場面での対応', duration: 720, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },

  // ========================================
  // カテゴリー4: はじめに（STARTUP_GUIDE）
  // ========================================
  {
    title: 'UGSオンラインスクールの使い方',
    description: 'アプリの基本操作を学ぶ',
    category: 'STARTUP_GUIDE',
    level: 'BASIC',
    isLocked: false,
    order: 1,
    lessons: [
      { title: 'ログイン方法', description: 'アカウントへのアクセス', duration: 180, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'ダッシュボードの見方', description: '各機能の説明', duration: 300, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '学習コンテンツの視聴方法', description: '動画の視聴と進捗管理', duration: 240, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'UGSの考え方・理念',
    description: 'UGSの基本理念を理解する',
    category: 'STARTUP_GUIDE',
    level: 'BASIC',
    isLocked: false,
    order: 2,
    lessons: [
      { title: 'UGSのミッション', description: '私たちの目指すもの', duration: 420, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '成功への道のり', description: '成長のステップ', duration: 360, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
]

async function main() {
  console.log('🌱 Starting course seed...')

  // 既存のコースデータをクリア
  console.log('📦 Clearing existing course data...')
  await prisma.courseProgress.deleteMany({})
  await prisma.lesson.deleteMany({})
  await prisma.course.deleteMany({})

  // コースを順番に作成
  console.log('📚 Creating courses...')
  for (const courseData of coursesData) {
    const course = await prisma.course.create({
      data: {
        title: courseData.title,
        description: courseData.description,
        category: courseData.category,
        level: courseData.level,
        isLocked: courseData.isLocked,
        isPublished: true,
        order: courseData.order,
        lessons: {
          create: courseData.lessons.map(lesson => ({
            title: lesson.title,
            description: lesson.description,
            duration: lesson.duration,
            order: lesson.order,
            videoUrl: lesson.videoUrl,
            isPublished: true,
          })),
        },
      },
    })
    console.log(`  ✓ Created course: ${course.title} (${courseData.lessons.length} lessons)`)
  }

  // 統計を表示
  const courseCount = await prisma.course.count()
  const lessonCount = await prisma.lesson.count()

  console.log('\n📊 Seed Summary:')
  console.log(`  - Total courses: ${courseCount}`)
  console.log(`  - Total lessons: ${lessonCount}`)
  console.log('✅ Course seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
