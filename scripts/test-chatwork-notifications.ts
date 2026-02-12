/**
 * Chatwork通知機能のテストスクリプト
 * 全9種類の通知をテスト送信する
 *
 * 実行方法: npx tsx scripts/test-chatwork-notifications.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const CHATWORK_API_URL = 'https://api.chatwork.com/v2'

// ルームID
const CHATWORK_ROOM_IDS = {
  PAYMENT: '420332678',      // 決済／会員管理
  SUPPORT: '420332656',      // サポート／問い合わせ
  PROMOTION: '420332637',    // 昇格・面談
}

// 共通メンション
const NOTIFICATION_MENTIONS = `[To:6658741]野々垣暁洋さん
[To:8995295]安井聡史さん
[To:8991677]小林亮太さん`

function formatJapaneseDateTime(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
}

function formatJapaneseDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  })
}

async function sendChatworkMessage(roomId: string, message: string): Promise<void> {
  const apiToken = process.env.CHATWORK_API_TOKEN

  if (!apiToken) {
    throw new Error('CHATWORK_API_TOKEN is not set')
  }

  const response = await fetch(`${CHATWORK_API_URL}/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: {
      'X-ChatWorkToken': apiToken,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ body: message }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Chatwork API error: ${response.status} - ${errorText}`)
  }
}

async function testAllNotifications() {
  console.log('=== Chatwork通知テスト開始 ===\n')

  const apiToken = process.env.CHATWORK_API_TOKEN
  if (!apiToken) {
    console.error('❌ CHATWORK_API_TOKEN が設定されていません')
    console.error('   .env.local ファイルに CHATWORK_API_TOKEN を設定してください')
    process.exit(1)
  }

  console.log('✅ CHATWORK_API_TOKEN を確認\n')

  const testUser = {
    name: '【テスト】山田太郎',
    email: 'test@example.com',
  }

  // 少し待機（API制限対策）
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // 1. アプリ登録決済通知
  console.log('1. アプリ登録決済通知を送信中...')
  try {
    const message = `${NOTIFICATION_MENTIONS}

[info][title]【テスト】アプリ登録決済通知[/title]名前：${testUser.name}
メールアドレス：${testUser.email}
登録日時：${formatJapaneseDateTime(new Date())}[/info]`
    await sendChatworkMessage(CHATWORK_ROOM_IDS.PAYMENT, message)
    console.log('   ✅ 送信完了')
  } catch (error) {
    console.error('   ❌ 送信失敗:', error)
  }
  await delay(1000)

  // 2. 決済失敗通知
  console.log('2. 決済失敗通知を送信中...')
  try {
    const amount = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(5500)
    const message = `${NOTIFICATION_MENTIONS}

[info][title]【テスト】決済失敗通知[/title]名前：${testUser.name}
メールアドレス：${testUser.email}
失敗日時：${formatJapaneseDateTime(new Date())}
未納金額：${amount}[/info]`
    await sendChatworkMessage(CHATWORK_ROOM_IDS.PAYMENT, message)
    console.log('   ✅ 送信完了')
  } catch (error) {
    console.error('   ❌ 送信失敗:', error)
  }
  await delay(1000)

  // 3. 退会申請通知
  console.log('3. 退会申請通知を送信中...')
  try {
    const registeredAt = new Date('2025-10-01T10:00:00')
    const message = `${NOTIFICATION_MENTIONS}

[info][title]【テスト】退会申請通知[/title]名前：${testUser.name}
メールアドレス：${testUser.email}
紹介者：なし
退会日時：${formatJapaneseDateTime(new Date())}
登録日：${formatJapaneseDateTime(registeredAt)}
退会申請理由：金額が高いと感じた（他のサービスの方が安い）
契約期間：6ヶ月以上[/info]`
    await sendChatworkMessage(CHATWORK_ROOM_IDS.PAYMENT, message)
    console.log('   ✅ 送信完了')
  } catch (error) {
    console.error('   ❌ 送信失敗:', error)
  }
  await delay(1000)

  // 4. 個別相談提出通知
  console.log('4. 個別相談提出通知を送信中...')
  try {
    const message = `${NOTIFICATION_MENTIONS}

[info][title]【テスト】個別相談提出通知[/title]名前：${testUser.name}
メールアドレス：${testUser.email}
相談ジャンル：ライフプラン
提出日時：${formatJapaneseDateTime(new Date())}[/info]`
    await sendChatworkMessage(CHATWORK_ROOM_IDS.SUPPORT, message)
    console.log('   ✅ 送信完了')
  } catch (error) {
    console.error('   ❌ 送信失敗:', error)
  }
  await delay(1000)

  // 5. お問い合わせ通知
  console.log('5. お問い合わせ通知を送信中...')
  try {
    const message = `${NOTIFICATION_MENTIONS}

[info][title]【テスト】お問い合わせ通知[/title]名前：${testUser.name}
メールアドレス：${testUser.email}
問い合わせ種別：支払い・請求について
提出日時：${formatJapaneseDateTime(new Date())}[/info]`
    await sendChatworkMessage(CHATWORK_ROOM_IDS.SUPPORT, message)
    console.log('   ✅ 送信完了')
  } catch (error) {
    console.error('   ❌ 送信失敗:', error)
  }
  await delay(1000)

  // 6. FPエイド昇格承認通知
  console.log('6. FPエイド昇格承認通知を送信中...')
  try {
    const message = `${NOTIFICATION_MENTIONS}

[info][title]【テスト】FPエイド昇格承認通知[/title]名前：${testUser.name}
メールアドレス：${testUser.email}
承認日時：${formatJapaneseDateTime(new Date())}[/info]`
    await sendChatworkMessage(CHATWORK_ROOM_IDS.PROMOTION, message)
    console.log('   ✅ 送信完了')
  } catch (error) {
    console.error('   ❌ 送信失敗:', error)
  }
  await delay(1000)

  // 7. MGR昇格承認通知
  console.log('7. MGR昇格承認通知を送信中...')
  try {
    const message = `${NOTIFICATION_MENTIONS}

[info][title]【テスト】MGR昇格承認通知[/title]名前：${testUser.name}
メールアドレス：${testUser.email}
承認日時：${formatJapaneseDateTime(new Date())}[/info]`
    await sendChatworkMessage(CHATWORK_ROOM_IDS.PROMOTION, message)
    console.log('   ✅ 送信完了')
  } catch (error) {
    console.error('   ❌ 送信失敗:', error)
  }
  await delay(1000)

  // 8. LP面談リクエスト通知
  console.log('8. LP面談リクエスト通知を送信中...')
  try {
    const preferredDates = [
      new Date('2026-01-20'),
      new Date('2026-01-21'),
      new Date('2026-01-22'),
      new Date('2026-01-23'),
      new Date('2026-01-24'),
    ]
    const formattedDates = preferredDates.map(d => formatJapaneseDate(d)).join(', ')
    const message = `${NOTIFICATION_MENTIONS}

[info][title]【テスト】LP面談リクエスト通知[/title]名前：${testUser.name}
メールアドレス：${testUser.email}
希望日時：${formattedDates}
申請日時：${formatJapaneseDateTime(new Date())}[/info]`
    await sendChatworkMessage(CHATWORK_ROOM_IDS.PROMOTION, message)
    console.log('   ✅ 送信完了')
  } catch (error) {
    console.error('   ❌ 送信失敗:', error)
  }
  await delay(1000)

  // 9. LP面談確定通知
  console.log('9. LP面談確定通知を送信中...')
  try {
    const message = `${NOTIFICATION_MENTIONS}

[info][title]【テスト】LP面談確定通知[/title]名前：${testUser.name}
メールアドレス：${testUser.email}
確定日時：${formatJapaneseDateTime(new Date('2026-01-20T15:00:00'))}
面談者：田中花子[/info]`
    await sendChatworkMessage(CHATWORK_ROOM_IDS.PROMOTION, message)
    console.log('   ✅ 送信完了')
  } catch (error) {
    console.error('   ❌ 送信失敗:', error)
  }

  console.log('\n=== Chatwork通知テスト完了 ===')
  console.log('\n各Chatworkグループを確認してください:')
  console.log('- [UGS通知]決済／会員管理 (420332678): 3件')
  console.log('- [UGS通知]サポート／問い合わせ (420332656): 2件')
  console.log('- [UGS通知]昇格・面談 (420332637): 4件')
}

// 実行
testAllNotifications().catch(console.error)
