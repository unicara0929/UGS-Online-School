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
  {
    title: '所得を増やすマネーリテラシー全般 - 基礎編',
    description: 'マネーリテラシーの基礎知識を学ぶ',
    category: 'MONEY_LITERACY',
    level: 'BASIC',
    isLocked: false,
    order: 1,
    lessons: [
      { title: 'お金の5つの力と生きるための金融知識', description: 'お金の基礎知識', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'ライフプランニングの考え方', description: '人生設計とお金の計画', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '家計簿の付け方／支出の見直し術', description: '家計管理の基本', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '税金の基本（所得税・住民税・控除制度）', description: '税金の基礎知識', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '社会保障制度（年金／健康保険／失業保険）', description: '社会保障の理解', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '保険の基礎①：保険基礎知識', description: '保険の基本を学ぶ①', duration: 600, order: 6, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '保険の基礎②：保険基礎知識', description: '保険の基本を学ぶ②', duration: 600, order: 7, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '投資の基本／長期、積立、分散', description: '投資の基本原則', duration: 600, order: 8, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '株式投資、投資信託の仕組み', description: '株式・投資信託を理解', duration: 600, order: 9, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '債券投資の仕組み', description: '債券投資を理解', duration: 600, order: 10, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'NISA・iDeCo・DCの仕組みと活用法', description: '税制優遇制度の活用', duration: 600, order: 11, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '不動産基礎編①：不動産投資の仕組み', description: '不動産投資の基本①', duration: 600, order: 12, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '不動産基礎編②：会社選びのポイント', description: '不動産投資の基本②', duration: 600, order: 13, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '固定費を下げる通信キャリア選び', description: '通信費の見直し', duration: 600, order: 14, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '経済勉強会', description: '経済の基礎を学ぶ', duration: 600, order: 15, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '所得を増やすマネーリテラシー全般 - 応用編',
    description: 'マネーリテラシーの応用知識を学ぶ',
    category: 'MONEY_LITERACY',
    level: 'ADVANCED',
    isLocked: false,
    order: 2,
    lessons: [
      { title: '保険のヒアリング〜提案〜契約までの流れ', description: '保険提案の実践', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '不動産会社の選び方', description: '不動産会社選定のポイント', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'ふるさと納税', description: 'ふるさと納税の活用', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'ポイント効率の良いクレカの選び方', description: 'クレジットカード選び', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'すぐに所得を作るポイ活', description: 'ポイ活の実践', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },

  // ========================================
  // カテゴリー2: 実践スキル
  // ========================================
  {
    title: '実践スキル - 基礎編',
    description: '営業・ビジネスの基礎スキルを学ぶ',
    category: 'PRACTICAL_SKILL',
    level: 'BASIC',
    isLocked: true,
    order: 1,
    lessons: [
      { title: 'セールスに必要な心構えと基本フロー', description: 'セールスの基本を学ぶ', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'ビジネスマナー', description: 'ビジネスマナーの基礎', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '信頼を築くコミュニケーションの基礎', description: 'コミュニケーションスキル', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'マイストーリー構築ワーク', description: '自己紹介ストーリーの構築', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '"なぜ"を深掘るワーク 商材', description: '商材理解を深める', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '顧客のタイプと話し方の変え方（DISC理論導入）', description: 'DISC理論の基礎', duration: 600, order: 6, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'MBTI研修（性格タイプ理解）', description: 'MBTI性格タイプの理解', duration: 600, order: 7, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'MLMマルチネズミ講の違い', description: 'MLMとネズミ講の違い', duration: 600, order: 8, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'マネジメントにおける基礎知識', description: 'マネジメントの基本', duration: 600, order: 9, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '人材マネジメント', description: '人材管理の基礎', duration: 600, order: 10, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '業務マネジメント', description: '業務管理の基礎', duration: 600, order: 11, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'FPエイドの活動における便利なツール', description: '便利ツールの活用', duration: 600, order: 12, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '住宅事業概要', description: '住宅事業の概要', duration: 600, order: 13, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '賃貸事業概要', description: '賃貸事業の概要', duration: 600, order: 14, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'スーツ事業概要', description: 'スーツ事業の概要', duration: 600, order: 15, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '転職支援事業概要', description: '転職支援事業の概要', duration: 600, order: 16, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '太陽光事業概要', description: '太陽光事業の概要', duration: 600, order: 17, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: '実践スキル - 応用編',
    description: '営業・ビジネスの応用スキルを学ぶ',
    category: 'PRACTICAL_SKILL',
    level: 'ADVANCED',
    isLocked: true,
    order: 2,
    lessons: [
      { title: '初回アポの組み方・トークスクリプト', description: 'アポイント獲得の技術', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '新規リスト獲得の手段設計', description: 'リスト獲得の方法', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '商談化率を高めるヒアリング技術', description: 'ヒアリングスキル向上', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '成約率を上げるストーリートーク法', description: 'ストーリーテリング技法', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '提案時の「不安」「反論」への対応トレーニング', description: '反論対応スキル', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '保険商品ごとの比較と提案スクリプト', description: '保険商品提案術', duration: 600, order: 6, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '紹介をもらい方', description: '紹介獲得の方法', duration: 600, order: 7, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'DISC理論を使った顧客対応訓練', description: 'DISC理論の実践', duration: 600, order: 8, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '顧客トラブルの事例紹介', description: 'トラブル対応事例', duration: 600, order: 9, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '適切な報告・連絡・相談', description: '報連相の実践', duration: 600, order: 10, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'Bトレ', description: 'ビジネストレーニング', duration: 600, order: 11, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },

  // ========================================
  // カテゴリー3: スタートアップ支援
  // ========================================
  {
    title: 'スタートアップ支援 - 基礎編',
    description: 'スタートアップの基礎知識を学ぶ',
    category: 'STARTUP_SUPPORT',
    level: 'BASIC',
    isLocked: true,
    order: 1,
    lessons: [
      { title: '副業の必要性', description: '副業が必要な理由を理解する', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '副業を始める前に知るべき基礎知識', description: '副業スタート前の必須知識', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'FPビジネスの強み、ビジネスにおける優位性', description: 'FPビジネスの魅力と強み', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'メラビアン', description: 'メラビアンの法則', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '自分に向き合うマインドセット', description: '成功のためのマインドセット', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'ビジネスマインドセット', description: 'ビジネスに必要な考え方', duration: 600, order: 6, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'ロジカルシンキング', description: '論理的思考法を学ぶ', duration: 600, order: 7, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '目標設定、KGIKPI', description: 'KGI/KPIを使った目標設定', duration: 600, order: 8, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '開業届・確定申告の基礎', description: '開業届と確定申告の基本', duration: 600, order: 9, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'スプシ、関数やショートカットキー使い方', description: 'スプレッドシートの活用法', duration: 600, order: 10, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'AIの使い方', description: 'AIツールの活用方法', duration: 600, order: 11, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },
  {
    title: 'スタートアップ支援 - 応用編',
    description: 'スタートアップの応用知識を学ぶ',
    category: 'STARTUP_SUPPORT',
    level: 'ADVANCED',
    isLocked: true,
    order: 2,
    lessons: [
      { title: '金融副業を軸にしたキャリア戦略', description: 'キャリア戦略の考え方', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '日報／週報の設計とKPIの考え方', description: 'KPIに基づく日報・週報設計', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'コーチングとティーチング', description: '指導法の違いと使い分け', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '重要度と緊急度のマトリクス', description: '優先順位付けの手法', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '金融業界におけるマーケティング戦略', description: '金融マーケティングの基本', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '課題分析', description: '問題解決のための分析手法', duration: 600, order: 6, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'PL（損益計算書）の読み方と作り方', description: '損益計算書の理解と作成', duration: 600, order: 7, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '確定申告のやり方とクラウド会計の活用', description: '確定申告とクラウド会計', duration: 600, order: 8, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'インボイス制度について', description: 'インボイス制度の理解', duration: 600, order: 9, videoUrl: PLACEHOLDER_VIMEO_URL },
    ],
  },

  // ========================================
  // カテゴリー4: はじめに（STARTUP_GUIDE）- UGS会員向け
  // ========================================
  {
    title: 'はじめに - アプリの使い方',
    description: 'UGSオンラインスクールの使い方を学ぶ',
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
    title: 'はじめに - UGSの考え方',
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
  console.log('\n📋 Category breakdown:')
  console.log('  - 所得を増やすマネーリテラシー全般: 基礎編(8) + 応用編(6) = 14 lessons')
  console.log('  - 実践スキル: 基礎編(10) + 応用編(5) = 15 lessons')
  console.log('  - スタートアップ支援: 基礎編(9) + 応用編(6) = 15 lessons')
  console.log('  - はじめに: 5 lessons')
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
