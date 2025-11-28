/**
 * コンプライアンステスト問題のシードスクリプト
 *
 * 実行方法: npx tsx scripts/seed-compliance-test.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ComplianceTestQuestion {
  question: string
  options: string[]
  correctAnswer: number // 0-3
  explanation: string
  category: string
  order: number
}

const complianceTestQuestions: ComplianceTestQuestion[] = [
  // マネーロンダリング対策（AML）
  {
    question: 'マネーロンダリングとは何ですか？',
    options: [
      '金融商品の売買を行うこと',
      '犯罪で得た資金を合法的に見せかける行為',
      '海外送金を行うこと',
      '大口取引を行うこと'
    ],
    correctAnswer: 1,
    explanation: 'マネーロンダリング（資金洗浄）とは、犯罪によって得られた資金の出所を隠し、合法的な資金であるかのように見せかける行為です。金融機関や保険会社は、この行為を防止する義務があります。',
    category: 'マネーロンダリング対策',
    order: 1
  },
  {
    question: '「犯罪収益移転防止法」において、金融機関等が本人確認を行う必要があるのはどのような場合ですか？',
    options: [
      '全ての顧客に対して毎回本人確認が必要',
      '取引金額に関係なく本人確認は不要',
      '新規契約時や一定額以上の取引時など、特定の取引時に必要',
      '顧客が希望した場合のみ必要'
    ],
    correctAnswer: 2,
    explanation: '犯罪収益移転防止法では、新規契約時、200万円を超える現金取引時、10万円を超える現金送金時など、特定の取引において本人確認（取引時確認）が義務付けられています。',
    category: 'マネーロンダリング対策',
    order: 2
  },
  {
    question: '疑わしい取引を発見した場合、どのような対応が求められますか？',
    options: [
      '顧客に直接確認する',
      '取引を完了させてから所轄の警察に報告する',
      '金融機関等を通じて金融庁に届け出る',
      '何もせず様子を見る'
    ],
    correctAnswer: 2,
    explanation: '疑わしい取引を発見した場合は、顧客に知らせることなく、所属する金融機関等を通じて金融庁に「疑わしい取引の届出」を行う必要があります。顧客に直接確認すると、証拠隠滅などのリスクがあります。',
    category: 'マネーロンダリング対策',
    order: 3
  },

  // コンプライアンス全般
  {
    question: '保険募集において「適合性の原則」とは何を意味しますか？',
    options: [
      '顧客に最も高額な商品を勧めること',
      '顧客の知識・経験・財産状況・契約目的に照らして適切な商品を勧めること',
      '会社が定めた販売目標に適合する商品を勧めること',
      '手数料率が最も高い商品を勧めること'
    ],
    correctAnswer: 1,
    explanation: '適合性の原則とは、顧客の知識、経験、財産の状況、契約締結の目的に照らして不適当な勧誘を行ってはならないという原則です。顧客保護の観点から非常に重要な原則です。',
    category: 'コンプライアンス',
    order: 4
  },
  {
    question: '保険業法において禁止されている「特別利益の提供」に該当するものはどれですか？',
    options: [
      '契約内容の丁寧な説明',
      '契約者に対する保険料の一部割引やキャッシュバック',
      '商品パンフレットの提供',
      '契約後のアフターフォロー'
    ],
    correctAnswer: 1,
    explanation: '保険業法では、保険契約の締結や募集に際して、保険料の割引、リベート、景品などの特別の利益を提供することが禁止されています。これは公正な保険募集を確保するためです。',
    category: 'コンプライアンス',
    order: 5
  },
  {
    question: '「重要事項説明」について正しい説明はどれですか？',
    options: [
      '口頭での説明のみで書面交付は不要',
      '契約締結後に説明すればよい',
      '契約締結前に書面を交付して説明する義務がある',
      '顧客が不要と言えば省略できる'
    ],
    correctAnswer: 2,
    explanation: '重要事項説明は、保険契約の締結前に契約概要・注意喚起情報などを記載した書面を交付し、顧客の理解を得ながら説明を行う義務があります。顧客の意向に関わらず省略することはできません。',
    category: 'コンプライアンス',
    order: 6
  },

  // 個人情報保護
  {
    question: '個人情報保護法において「個人情報」に該当するものはどれですか？',
    options: [
      '氏名のみ',
      '会社名のみ',
      '生存する個人に関する情報で、特定の個人を識別できるもの',
      '死亡した人の情報のみ'
    ],
    correctAnswer: 2,
    explanation: '個人情報保護法における「個人情報」とは、生存する個人に関する情報であって、氏名、生年月日その他の記述等により特定の個人を識別することができるものを指します。',
    category: '個人情報保護',
    order: 7
  },
  {
    question: '顧客の個人情報を第三者に提供する場合、原則として何が必要ですか？',
    options: [
      '特に何も必要ない',
      '本人の同意',
      '上司の許可のみ',
      '会社への報告のみ'
    ],
    correctAnswer: 1,
    explanation: '個人情報を第三者に提供する場合は、原則として本人の同意が必要です。ただし、法令に基づく場合や人の生命・身体・財産の保護のために必要な場合など、例外もあります。',
    category: '個人情報保護',
    order: 8
  },

  // 保険の基礎知識
  {
    question: '生命保険契約における「告知義務」について正しい説明はどれですか？',
    options: [
      '保険会社から質問されたことのみ正確に答えればよい',
      '病歴があっても契約したい場合は隠してもよい',
      '保険会社が質問した事項について事実を正確に告知する義務がある',
      '告知は任意であり義務ではない'
    ],
    correctAnswer: 2,
    explanation: '告知義務とは、保険契約の申込み時に、保険会社が質問した事項（健康状態、職業など）について事実を正確に告知する義務です。告知義務違反があると、保険金が支払われない場合があります。',
    category: '保険基礎知識',
    order: 9
  },
  {
    question: '保険契約における「クーリング・オフ制度」について正しい説明はどれですか？',
    options: [
      '契約後いつでも無条件で解約できる制度',
      '一定期間内であれば書面により申込みの撤回や契約の解除ができる制度',
      '保険料の割引を受けられる制度',
      '保険金の増額ができる制度'
    ],
    correctAnswer: 1,
    explanation: 'クーリング・オフ制度とは、契約の申込日または書面交付日のいずれか遅い日から8日以内であれば、書面により申込みの撤回や契約の解除ができる制度です。ただし、一部例外もあります。',
    category: '保険基礎知識',
    order: 10
  }
]

async function main() {
  console.log('コンプライアンステスト問題のシード開始...')

  // 既存の問題を確認
  const existingCount = await prisma.complianceTestQuestion.count()
  console.log(`既存の問題数: ${existingCount}`)

  if (existingCount > 0) {
    console.log('既存の問題があるため、シードをスキップします')
    console.log('全ての問題を削除して再シードする場合は、手動で削除してください')
    return
  }

  // 問題を作成
  for (const q of complianceTestQuestions) {
    await prisma.complianceTestQuestion.create({
      data: {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        category: q.category,
        order: q.order,
        isActive: true
      }
    })
    console.log(`問題を作成: ${q.question.substring(0, 30)}...`)
  }

  console.log(`\nコンプライアンステスト問題のシード完了: ${complianceTestQuestions.length}問`)
}

main()
  .catch((e) => {
    console.error('シードエラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
