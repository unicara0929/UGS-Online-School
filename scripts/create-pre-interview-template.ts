import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 既存のテンプレートを確認
  const existing = await prisma.preInterviewTemplate.findFirst({
    where: { name: 'LP面談事前アンケート' }
  })

  if (existing) {
    console.log('テンプレートは既に存在します:', existing.id)
    return
  }

  const template = await prisma.preInterviewTemplate.create({
    data: {
      name: 'LP面談事前アンケート',
      description: 'LP面談前にご回答いただくアンケートです。面談をより有意義なものにするため、現在の状況やご関心についてお聞かせください。',
      isActive: true,
      version: 1,
      questions: {
        create: [
          // 基本情報
          {
            order: 1,
            category: '基本情報',
            question: '現在のご職業を教えてください',
            type: 'SELECT',
            options: ['会社員', '公務員', '自営業・フリーランス', '経営者・役員', 'パート・アルバイト', '学生', '主婦・主夫', 'その他'],
            required: true,
          },
          {
            order: 2,
            category: '基本情報',
            question: '年齢を教えてください',
            type: 'SELECT',
            options: ['20代', '30代', '40代', '50代', '60代以上'],
            required: true,
          },
          {
            order: 3,
            category: '基本情報',
            question: 'ご家族構成を教えてください',
            type: 'SELECT',
            options: ['独身', '既婚（子どもなし）', '既婚（子どもあり）', 'その他'],
            required: true,
          },
          // 資産・収入
          {
            order: 4,
            category: '資産・収入',
            question: '現在の世帯年収を教えてください',
            type: 'SELECT',
            options: ['300万円未満', '300〜500万円', '500〜700万円', '700〜1000万円', '1000万円以上', '回答しない'],
            required: false,
          },
          {
            order: 5,
            category: '資産・収入',
            question: '現在の金融資産（預貯金・投資など）の総額を教えてください',
            type: 'SELECT',
            options: ['100万円未満', '100〜300万円', '300〜500万円', '500〜1000万円', '1000万円以上', '回答しない'],
            required: false,
          },
          // 投資経験
          {
            order: 6,
            category: '投資経験',
            question: '投資経験はありますか？',
            type: 'RADIO',
            options: ['経験あり', '経験なし'],
            required: true,
          },
          {
            order: 7,
            category: '投資経験',
            question: '経験のある投資商品を選択してください（複数選択可）',
            description: '投資経験がある方のみお答えください',
            type: 'MULTI_SELECT',
            options: ['株式投資', '投資信託', 'NISA・つみたてNISA', 'iDeCo', '不動産投資', 'FX', '仮想通貨', 'その他'],
            required: false,
          },
          // 保険
          {
            order: 8,
            category: '保険',
            question: '現在加入している保険を選択してください（複数選択可）',
            type: 'MULTI_SELECT',
            options: ['生命保険', '医療保険', 'がん保険', '学資保険', '個人年金保険', '自動車保険', '火災保険', '加入していない', 'わからない'],
            required: true,
          },
          {
            order: 9,
            category: '保険',
            question: '保険の見直しに興味はありますか？',
            type: 'RADIO',
            options: ['興味がある', '少し興味がある', '興味がない', 'わからない'],
            required: true,
          },
          // ライフプラン
          {
            order: 10,
            category: 'ライフプラン',
            question: '今後のライフイベントで気になることを選択してください（複数選択可）',
            type: 'MULTI_SELECT',
            options: ['結婚', '出産・子育て', '住宅購入', '教育資金', '転職・キャリアアップ', '独立・起業', '老後の生活', '相続・贈与', '特になし'],
            required: true,
          },
          {
            order: 11,
            category: 'ライフプラン',
            question: '住宅について教えてください',
            type: 'SELECT',
            options: ['持ち家（ローンあり）', '持ち家（ローンなし）', '賃貸', '実家暮らし', 'その他'],
            required: true,
          },
          // 面談への期待
          {
            order: 12,
            category: '面談への期待',
            question: 'LP面談で特に相談したいことを選択してください（複数選択可）',
            type: 'MULTI_SELECT',
            options: ['家計の見直し', '資産運用の始め方', '保険の見直し', '住宅ローンの相談', '教育資金の準備', '老後資金の準備', 'NISA・iDeCoの活用', '税金対策', 'FPエイドの活動について', 'その他'],
            required: true,
          },
          {
            order: 13,
            category: '面談への期待',
            question: 'その他、面談前にお伝えしておきたいことがあればご記入ください',
            type: 'TEXTAREA',
            required: false,
          },
        ]
      }
    },
    include: {
      questions: true
    }
  })

  console.log('テンプレート作成完了:', template.name)
  console.log('質問数:', template.questions.length)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
