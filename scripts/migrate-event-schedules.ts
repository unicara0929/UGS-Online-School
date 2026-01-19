/**
 * イベント日程データ移行スクリプト
 *
 * 既存のEventレコードからEventScheduleレコードを作成し、
 * EventRegistration/ExternalEventRegistrationにscheduleIdを設定する
 *
 * 実行方法: npx tsx scripts/migrate-event-schedules.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== イベント日程データ移行開始 ===\n')

  // 1. 全イベントを取得（date, time, location, onlineMeetingUrl, attendanceCodeを含む）
  const events = await prisma.$queryRaw<Array<{
    id: string
    date: Date
    time: string | null
    location: string | null
    onlineMeetingUrl: string | null
    attendanceCode: string | null
  }>>`
    SELECT id, date, time, location, "onlineMeetingUrl", "attendanceCode"
    FROM events
    WHERE date IS NOT NULL
  `

  console.log(`移行対象イベント数: ${events.length}件\n`)

  let migratedCount = 0
  let skippedCount = 0

  for (const event of events) {
    // 既にEventScheduleが存在するかチェック
    const existingSchedule = await prisma.eventSchedule.findFirst({
      where: { eventId: event.id }
    })

    if (existingSchedule) {
      console.log(`  スキップ: ${event.id} (既にスケジュールあり)`)
      skippedCount++
      continue
    }

    // EventScheduleを作成
    const schedule = await prisma.eventSchedule.create({
      data: {
        eventId: event.id,
        date: event.date,
        time: event.time,
        location: event.location,
        onlineMeetingUrl: event.onlineMeetingUrl,
        attendanceCode: event.attendanceCode,
        status: 'OPEN',
      }
    })

    // このイベントの全EventRegistrationのscheduleIdを更新
    const updatedRegistrations = await prisma.eventRegistration.updateMany({
      where: {
        eventId: event.id,
        scheduleId: null
      },
      data: { scheduleId: schedule.id }
    })

    // このイベントの全ExternalEventRegistrationのscheduleIdを更新
    const updatedExternalRegistrations = await prisma.externalEventRegistration.updateMany({
      where: {
        eventId: event.id,
        scheduleId: null
      },
      data: { scheduleId: schedule.id }
    })

    console.log(`  移行完了: ${event.id}`)
    console.log(`    - EventSchedule作成: ${schedule.id}`)
    console.log(`    - EventRegistration更新: ${updatedRegistrations.count}件`)
    console.log(`    - ExternalEventRegistration更新: ${updatedExternalRegistrations.count}件`)

    migratedCount++
  }

  console.log('\n=== 移行完了 ===')
  console.log(`移行成功: ${migratedCount}件`)
  console.log(`スキップ: ${skippedCount}件`)
}

main()
  .catch((e) => {
    console.error('エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
