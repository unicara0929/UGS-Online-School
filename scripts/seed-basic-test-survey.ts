import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('基礎テストとアンケートを作成中...')

  // 基礎テストを作成（10問）
  const basicTest = await prisma.basicTest.upsert({
    where: { id: 'basic-test-001' },
    update: {},
    create: {
      id: 'basic-test-001',
      title: 'FPエイド昇格 基礎編テスト',
      passingScore: 70,
      questions: [
        {
          id: 'q1',
          question: 'FP（ファイナンシャルプランナー）の主な役割は何ですか？',
          options: [
            '資産運用のみを行う',
            '顧客のライフプランに基づいた総合的な財務アドバイスを行う',
            '保険商品の販売のみを行う',
            '不動産投資の紹介のみを行う'
          ],
          correctAnswer: 1
        },
        {
          id: 'q2',
          question: 'ライフプランニングにおいて最も重要な要素は何ですか？',
          options: [
            '高利回りの投資商品',
            '顧客の人生設計と価値観',
            '最新の金融商品情報',
            '税務対策のみ'
          ],
          correctAnswer: 1
        },
        {
          id: 'q3',
          question: 'FPが扱う6つの分野（6つの係数）に含まれないものはどれですか？',
          options: [
            'ライフプランニング',
            'リスク管理',
            '金融資産運用',
            'IT技術'
          ],
          correctAnswer: 3
        },
        {
          id: 'q4',
          question: '資産運用における「リスク」とは何を意味しますか？',
          options: [
            '必ず損失が出ること',
            '投資結果の不確実性（価格変動の可能性）',
            '投資を避けるべきこと',
            '高利回りを保証すること'
          ],
          correctAnswer: 1
        },
        {
          id: 'q5',
          question: 'FPが顧客の情報を守る義務を何といいますか？',
          options: [
            '守秘義務',
            '営業義務',
            '報告義務',
            '納税義務'
          ],
          correctAnswer: 0
        },
        {
          id: 'q6',
          question: 'ライフプランニングのプロセスで最初に行うべきことは何ですか？',
          options: [
            '投資商品を選ぶ',
            '顧客の現状把握と目標設定',
            '保険に加入する',
            '不動産を購入する'
          ],
          correctAnswer: 1
        },
        {
          id: 'q7',
          question: 'FPが推奨すべき投資スタンスはどれですか？',
          options: [
            '顧客のリスク許容度と投資目的に応じた分散投資',
            '高利回り商品への集中投資',
            '短期間での利益を追求する投資',
            '他人の推奨をそのまま採用する'
          ],
          correctAnswer: 0
        },
        {
          id: 'q8',
          question: 'FPが顧客に説明すべき重要な原則は何ですか？',
          options: [
            '必ず儲かる投資商品',
            'リスクとリターンの関係',
            '税務対策のみ',
            '短期間での利益保証'
          ],
          correctAnswer: 1
        },
        {
          id: 'q9',
          question: 'ライフプランニングにおいて「キャッシュフロー表」の主な目的は何ですか？',
          options: [
            '過去の収支を記録する',
            '将来の収支を予測し、資金計画を立てる',
            '税務申告書を作成する',
            '投資商品を比較する'
          ],
          correctAnswer: 1
        },
        {
          id: 'q10',
          question: 'FPとして顧客と接する際に最も重要な姿勢は何ですか？',
          options: [
            '自分の意見を押し付ける',
            '顧客の立場に立ち、誠実にアドバイスする',
            '高額な商品を勧める',
            '短期的な利益を優先する'
          ],
          correctAnswer: 1
        }
      ]
    }
  })

  console.log('✅ 基礎テストを作成しました:', basicTest.id)

  // アンケートを作成（10設問）
  const survey = await prisma.survey.upsert({
    where: { id: 'survey-001' },
    update: {},
    create: {
      id: 'survey-001',
      title: 'FPエイド昇格 初回アンケート',
      questions: [
        {
          id: 'sq1',
          question: 'UGSオンラインスクールに参加した理由を教えてください。',
          type: 'textarea',
          required: true
        },
        {
          id: 'sq2',
          question: 'FPエイドとしてどのような活動をしたいですか？',
          type: 'textarea',
          required: true
        },
        {
          id: 'sq3',
          question: '現在の職業・業種を教えてください。',
          type: 'text',
          required: true
        },
        {
          id: 'sq4',
          question: 'FPとしての経験年数を教えてください。',
          type: 'select',
          options: ['未経験', '1年未満', '1-3年', '3-5年', '5年以上'],
          required: true
        },
        {
          id: 'sq5',
          question: 'FP資格の有無を教えてください。',
          type: 'radio',
          options: ['FP資格あり', 'FP資格なし'],
          required: true
        },
        {
          id: 'sq6',
          question: 'UGSオンラインスクールで最も興味のあるカテゴリはどれですか？',
          type: 'radio',
          options: ['所得を増やす', '生き方を豊かにする', 'スタートアップ支援'],
          required: true
        },
        {
          id: 'sq7',
          question: 'FPエイドとして期待する報酬の目標額を教えてください。',
          type: 'select',
          options: ['月5万円以下', '月5-10万円', '月10-20万円', '月20万円以上'],
          required: true
        },
        {
          id: 'sq8',
          question: 'UGSオンラインスクールで学びたいことや期待することを教えてください。',
          type: 'textarea',
          required: true
        },
        {
          id: 'sq9',
          question: 'FPエイドとして活動する上で不安に感じていることはありますか？',
          type: 'textarea',
          required: false
        },
        {
          id: 'sq10',
          question: 'その他、ご意見やご要望がございましたらお聞かせください。',
          type: 'textarea',
          required: false
        }
      ]
    }
  })

  console.log('✅ アンケートを作成しました:', survey.id)
  console.log('✅ シードデータの作成が完了しました')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

