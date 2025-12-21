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
      { title: 'ライフプランニング', description: '人生設計とお金の計画', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '老後資金', description: '老後に必要な資金について', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '保険選び', description: '自分に合った保険の選び方', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '住宅', description: '住宅購入と資金計画', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '転職', description: '転職とキャリアアップ', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '投資基礎', description: '投資の基本を学ぶ', duration: 600, order: 6, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '節税', description: '合法的な節税方法', duration: 600, order: 7, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '相続', description: '相続の基本知識', duration: 600, order: 8, videoUrl: PLACEHOLDER_VIMEO_URL },
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
      { title: 'FXトレード', description: 'FX取引の応用知識', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '株式投資', description: '株式投資の実践', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '経営者保険', description: '経営者向け保険活用', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '法人決算書', description: '決算書の読み方', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '家族信託', description: '家族信託の活用', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'その他事例', description: '様々な資産運用事例', duration: 600, order: 6, videoUrl: PLACEHOLDER_VIMEO_URL },
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
      { title: 'テレアポ', description: 'テレアポの基本スキル', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'タイプ別理解', description: '顧客タイプ別対応', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'ヒアリング', description: 'ヒアリングスキル', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '時間管理', description: '効率的な時間管理', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'マインドセット', description: '成功するマインド', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'プレゼンテーション', description: 'プレゼンスキル', duration: 600, order: 6, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'クロージング', description: 'クロージング技術', duration: 600, order: 7, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'フォローアップ', description: 'アフターフォロー', duration: 600, order: 8, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '顧客管理', description: '顧客情報の管理', duration: 600, order: 9, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'コミュニケーション', description: 'コミュニケーション力', duration: 600, order: 10, videoUrl: PLACEHOLDER_VIMEO_URL },
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
      { title: 'メンタルブロック外し', description: '心理的障壁の克服', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '即決クロージング', description: '即決を引き出す技術', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'オンライン面談術', description: 'オンライン商談の技術', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'チーム作り', description: 'チームビルディング', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '研修用', description: '研修資料・ロープレ', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
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
      { title: 'スタートアップの第一歩', description: '起業への心構えと準備', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '事業計画の作成', description: 'ビジネスプランの書き方', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '法務・手続き', description: '会社設立の法的手続き', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'マーケティング基礎', description: '顧客理解と市場分析', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '資金調達', description: '融資・出資の基礎知識', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '顧客獲得の基本', description: '初期顧客の獲得方法', duration: 600, order: 6, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '売上管理', description: '収支計画と管理手法', duration: 600, order: 7, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '人材採用', description: 'チームビルディングの基本', duration: 600, order: 8, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '事業継続の考え方', description: '持続可能なビジネス運営', duration: 600, order: 9, videoUrl: PLACEHOLDER_VIMEO_URL },
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
      { title: 'スケールアップ戦略', description: '事業拡大の方法論', duration: 600, order: 1, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '事業再構築', description: 'ピボットと改善', duration: 600, order: 2, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '組織マネジメント', description: 'チーム運営の高度化', duration: 600, order: 3, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: '資金調達（応用）', description: '投資家へのアプローチ', duration: 600, order: 4, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'バスケ作り', description: '顧客基盤の構築', duration: 600, order: 5, videoUrl: PLACEHOLDER_VIMEO_URL },
      { title: 'ロープレ実践', description: '実践ロールプレイング', duration: 600, order: 6, videoUrl: PLACEHOLDER_VIMEO_URL },
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
