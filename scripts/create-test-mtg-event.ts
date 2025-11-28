import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 昨日の日付（終了済みイベントとして）
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(19, 0, 0, 0)

  // 出席完了期限（イベント終了後7日）
  const deadline = new Date(yesterday)
  deadline.setDate(deadline.getDate() + 7)

  const event = await prisma.event.create({
    data: {
      title: '【テスト】全体MTG 2024年11月',
      description: `月1回の全体MTG（テスト用）。

【出席確認方法】
1. リアルタイム参加の場合：会場またはオンラインで表示される参加コードを入力
2. 後日視聴の場合：録画を視聴してアンケートに回答

※このイベントは出席確認フローのテスト用です。`,
      date: yesterday,
      time: '19:00-21:00',
      type: 'OPTIONAL',
      targetRoles: ['MEMBER', 'FP', 'MANAGER'],
      attendanceType: 'REQUIRED',
      venueType: 'HYBRID',
      location: '東京都渋谷区（オンライン参加可）',
      maxParticipants: 100,
      status: 'COMPLETED',
      // 出席確認関連
      attendanceCode: 'TESTMTG',
      vimeoUrl: 'https://vimeo.com/123456789',
      surveyUrl: 'https://forms.google.com/example-survey',
      attendanceDeadline: deadline,
      // 過去イベント記録
      summary: 'テスト用の全体MTGです。出席確認フローの動作確認にご利用ください。',
      actualParticipants: 50,
      actualLocation: '東京都渋谷区 + Zoom',
    },
  })

  console.log('✅ テスト用全体MTGイベントを作成しました')
  console.log('ID:', event.id)
  console.log('タイトル:', event.title)
  console.log('参加コード:', event.attendanceCode)
  console.log('Vimeo URL:', event.vimeoUrl)
  console.log('アンケートURL:', event.surveyUrl)
  console.log('出席完了期限:', event.attendanceDeadline)

  // 現在のログインユーザーを取得してイベント登録を作成
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['MEMBER', 'FP', 'MANAGER', 'ADMIN'] }
    },
    take: 5
  })

  if (users.length > 0) {
    console.log('\n参加登録を作成中...')
    for (const user of users) {
      try {
        await prisma.eventRegistration.create({
          data: {
            userId: user.id,
            eventId: event.id,
            paymentStatus: 'NOT_REQUIRED',
          },
        })
        console.log(`- ${user.name} (${user.email}) を登録しました`)
      } catch (e) {
        // 既に登録済みの場合はスキップ
        console.log(`- ${user.name} は既に登録済み`)
      }
    }
  }

  console.log('\n=== 確認方法 ===')
  console.log('1. ダッシュボード → イベント → 上記イベントを開く')
  console.log('2. 出席確認セクションで以下を試せます:')
  console.log('   - 参加コード入力: TESTMTG')
  console.log('   - 録画視聴 + アンケート回答')
  console.log('\n管理者画面でVimeo URL/アンケートURLの編集も可能です:')
  console.log(`/dashboard/admin/events/${event.id}/archive`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
