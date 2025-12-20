import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 既存のコースデータをクリア（開発環境のみ）
  await prisma.courseProgress.deleteMany({})
  await prisma.lesson.deleteMany({})
  await prisma.course.deleteMany({})

  // コース1: 所得を増やすマネーリテラシー全般 - 基礎編
  const course1 = await prisma.course.create({
    data: {
      title: '所得を増やす',
      description: 'マネーリテラシー全般 - 知識をつけて、稼ぐ力を育てる',
      category: 'MONEY_LITERACY',
      level: 'BASIC',
      isLocked: false,
      lessons: {
        create: [
          {
            title: 'お金の基本概念',
            description: 'お金の本質と価値について学ぶ',
            duration: 15,
            order: 1,
            videoUrl: 'https://vimeo.com/1135031850', // テスト用Vimeo動画
          },
          {
            title: '収入の種類と特徴',
            description: '給与、事業収入、投資収入の違い',
            duration: 20,
            order: 2,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: '税金の基礎知識',
            description: '所得税、住民税の仕組み',
            duration: 25,
            order: 3,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: '社会保険制度',
            description: '健康保険、年金制度の理解',
            duration: 18,
            order: 4,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: '資産形成の考え方',
            description: '長期投資の重要性',
            duration: 22,
            order: 5,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: 'リスクとリターン',
            description: '投資におけるリスク管理',
            duration: 16,
            order: 6,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: '複利の力',
            description: '複利効果の理解と活用',
            duration: 14,
            order: 7,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: 'ライフプランニング基礎',
            description: '人生設計とお金の計画',
            duration: 28,
            order: 8,
            videoUrl: 'https://vimeo.com/1135031850',
          },
        ],
      },
    },
  })

  // コース2: 実践スキル - 基礎編
  const course2 = await prisma.course.create({
    data: {
      title: '生き方を豊かにする',
      description: '金融・経済を正しく理解し、お金を「怖いもの」から「使いこなす力」へ',
      category: 'PRACTICAL_SKILL',
      level: 'BASIC',
      isLocked: false,
      lessons: {
        create: [
          {
            title: '金融リテラシー基礎',
            description: '金融の基本概念',
            duration: 20,
            order: 1,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: '経済の仕組み',
            description: '経済活動の理解',
            duration: 25,
            order: 2,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: '投資の基本',
            description: '投資の種類と特徴',
            duration: 22,
            order: 3,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: '保険の役割',
            description: '保険の必要性と選び方',
            duration: 18,
            order: 4,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: 'ライフイベントとお金',
            description: '人生の節目でのお金の管理',
            duration: 24,
            order: 5,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: '消費者保護',
            description: '消費者としての権利と注意点',
            duration: 16,
            order: 6,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: 'マインドセット',
            description: '豊かな人生のための考え方',
            duration: 20,
            order: 7,
            videoUrl: 'https://vimeo.com/1135031850',
          },
        ],
      },
    },
  })

  // コース3: スタートアップ支援（FPエイド以上限定）- 基礎編
  const course3 = await prisma.course.create({
    data: {
      title: 'スタートアップ支援',
      description: 'ゼロから事業を立ち上げるために必要な知識・仕組みを学ぶ',
      category: 'STARTUP_SUPPORT',
      level: 'BASIC',
      isLocked: true, // FPエイド以上のみアクセス可能
      lessons: {
        create: [
          {
            title: '起業の基礎知識',
            description: '起業に必要な基本知識',
            duration: 30,
            order: 1,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: 'ビジネスモデル設計',
            description: '持続可能なビジネスモデル',
            duration: 35,
            order: 2,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: 'マーケティング入門',
            description: '顧客獲得の基本戦略',
            duration: 28,
            order: 3,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: 'セールス基礎',
            description: '営業スキルの基本',
            duration: 32,
            order: 4,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: '会計・財務基礎',
            description: '事業運営の財務管理',
            duration: 40,
            order: 5,
            videoUrl: 'https://vimeo.com/1135031850',
          },
          {
            title: '法務・コンプライアンス',
            description: '事業運営の法的要件',
            duration: 25,
            order: 6,
            videoUrl: 'https://vimeo.com/1135031850',
          },
        ],
      },
    },
  })

  console.log('✅ Courses created:', {
    course1: course1.id,
    course2: course2.id,
    course3: course3.id,
  })

  console.log('🌱 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
