/**
 * イベント日程データ移行スクリプト
 *
 * 既存のEventレコードからEventScheduleレコードを作成し、
 * EventRegistration/ExternalEventRegistrationにscheduleIdを設定する
 *
 * また、applicationDeadline/attendanceDeadline を日数ベースに変換する
 *
 * 実行方法: npx tsx scripts/migrate-event-schedules.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== イベント日程データ移行開始 ===\n')

  // 0. 移行前の統計を表示
  const totalEvents = await prisma.event.count()
  const totalRegistrations = await prisma.eventRegistration.count()
  const totalExternalRegistrations = await prisma.externalEventRegistration.count()

  console.log('【移行前の状態】')
  console.log(`  イベント数: ${totalEvents}件`)
  console.log(`  参加登録数: ${totalRegistrations}件`)
  console.log(`  外部参加登録数: ${totalExternalRegistrations}件\n`)

  // 1. 全イベントを取得（旧フィールドを含む）
  const events = await prisma.$queryRaw<Array<{
    id: string
    title: string
    date: Date | null
    time: string | null
    location: string | null
    onlineMeetingUrl: string | null
    attendanceCode: string | null
    applicationDeadline: Date | null
    attendanceDeadline: Date | null
  }>>`
    SELECT id, title, date, time, location, "onlineMeetingUrl", "attendanceCode",
           "applicationDeadline", "attendanceDeadline"
    FROM events
  `

  console.log(`移行対象イベント数: ${events.length}件\n`)

  let migratedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const event of events) {
    try {
      // 既にEventScheduleが存在するかチェック
      const existingSchedule = await prisma.eventSchedule.findFirst({
        where: { eventId: event.id }
      })

      if (existingSchedule) {
        console.log(`  スキップ: "${event.title}" (既にスケジュールあり)`)
        skippedCount++
        continue
      }

      // dateがnullの場合は現在日時を使用（通常はないはず）
      const eventDate = event.date || new Date()

      // EventScheduleを作成
      const schedule = await prisma.eventSchedule.create({
        data: {
          eventId: event.id,
          date: eventDate,
          time: event.time,
          location: event.location,
          onlineMeetingUrl: event.onlineMeetingUrl,
          attendanceCode: event.attendanceCode,
          status: 'OPEN',
        }
      })

      // applicationDeadlineを日数に変換
      let applicationDeadlineDays: number | null = null
      if (event.applicationDeadline && event.date) {
        const diffMs = event.date.getTime() - event.applicationDeadline.getTime()
        applicationDeadlineDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        if (applicationDeadlineDays < 0) applicationDeadlineDays = 0
      }

      // attendanceDeadlineを日数に変換
      let attendanceDeadlineDays: number | null = null
      if (event.attendanceDeadline && event.date) {
        const diffMs = event.attendanceDeadline.getTime() - event.date.getTime()
        attendanceDeadlineDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        if (attendanceDeadlineDays < 0) attendanceDeadlineDays = 0
      }

      // Eventの日数フィールドを更新
      await prisma.$executeRaw`
        UPDATE events
        SET "applicationDeadlineDays" = ${applicationDeadlineDays},
            "attendanceDeadlineDays" = ${attendanceDeadlineDays}
        WHERE id = ${event.id}
      `

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

      console.log(`  ✅ 移行完了: "${event.title}"`)
      console.log(`      - EventSchedule作成: ${schedule.id}`)
      console.log(`      - 参加登録の紐付け: ${updatedRegistrations.count}件`)
      console.log(`      - 外部参加登録の紐付け: ${updatedExternalRegistrations.count}件`)
      if (applicationDeadlineDays !== null) {
        console.log(`      - 申込期限: ${applicationDeadlineDays}日前`)
      }
      if (attendanceDeadlineDays !== null) {
        console.log(`      - 出席期限: ${attendanceDeadlineDays}日後`)
      }

      migratedCount++
    } catch (error) {
      console.error(`  ❌ エラー: "${event.title}" - ${error}`)
      errorCount++
    }
  }

  // 移行後の統計を表示
  const totalSchedules = await prisma.eventSchedule.count()
  const registrationsWithSchedule = await prisma.eventRegistration.count({
    where: { scheduleId: { not: null } }
  })
  const externalWithSchedule = await prisma.externalEventRegistration.count({
    where: { scheduleId: { not: null } }
  })

  console.log('\n=== 移行完了 ===')
  console.log(`移行成功: ${migratedCount}件`)
  console.log(`スキップ: ${skippedCount}件`)
  console.log(`エラー: ${errorCount}件`)

  console.log('\n【移行後の状態】')
  console.log(`  EventSchedule数: ${totalSchedules}件`)
  console.log(`  scheduleId設定済みの参加登録: ${registrationsWithSchedule}件`)
  console.log(`  scheduleId設定済みの外部参加登録: ${externalWithSchedule}件`)

  // データ整合性チェック
  console.log('\n【データ整合性チェック】')
  const orphanedRegistrations = await prisma.eventRegistration.count({
    where: { scheduleId: null }
  })
  const orphanedExternal = await prisma.externalEventRegistration.count({
    where: { scheduleId: null }
  })

  if (orphanedRegistrations === 0 && orphanedExternal === 0) {
    console.log('  ✅ 全ての参加登録がスケジュールに紐付いています')
  } else {
    console.log(`  ⚠️ scheduleIdがnullの参加登録: ${orphanedRegistrations}件`)
    console.log(`  ⚠️ scheduleIdがnullの外部参加登録: ${orphanedExternal}件`)
  }
}

main()
  .catch((e) => {
    console.error('エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
