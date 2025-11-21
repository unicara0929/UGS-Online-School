import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Vercel Cron用: 定期イベント自動生成API
 * GET /api/cron/generate-monthly-events
 *
 * 毎月第1日曜日の翌日（月曜日）に自動実行されるCronジョブ
 * 来月分のイベントがあるか確認し、なければ生成する
 *
 * vercel.jsonで以下のように設定：
 * {
 *   "crons": [{
 *     "path": "/api/cron/generate-monthly-events",
 *     "schedule": "0 0 * * 1"  // 毎週月曜日 0:00 UTC (JST 9:00)
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cronからのリクエストか確認
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const monthsAhead = 1 // 常に来月分まで確保
    const createdEvents = []

    // 今月と来月の各月をチェック
    for (let i = 0; i <= monthsAhead; i++) {
      const targetDate = getNextFirstSundayOfMonth(i)

      // 既に同じ日付でイベントが存在するかチェック
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      const existingEvent = await prisma.event.findFirst({
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
          isRecurring: true,
        },
      })

      if (existingEvent) {
        continue // 既に存在する場合はスキップ
      }

      // イベント開始時刻と終了時刻を設定
      const eventStart = new Date(targetDate)
      eventStart.setHours(19, 0, 0, 0) // 19:00 JST

      const eventEnd = new Date(targetDate)
      eventEnd.setHours(21, 0, 0, 0) // 21:00 JST

      // 出席期限: イベント終了24時間後
      const attendanceDeadline = new Date(eventEnd)
      attendanceDeadline.setHours(attendanceDeadline.getHours() + 24)

      // イベントを作成
      const event = await prisma.event.create({
        data: {
          title: `全体MTG ${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月`,
          description: '月1回の全体MTG。オフライン会場またはオンラインで参加してください。参加できない方は録画視聴+アンケート回答で出席扱いになります。',
          date: eventStart,
          time: '19:00-21:00',
          type: 'OPTIONAL',
          targetRoles: ['ALL'],
          attendanceType: 'OPTIONAL',
          venueType: 'HYBRID',
          location: 'オフライン会場 + オンライン',
          maxParticipants: null,
          status: 'UPCOMING',
          isPaid: false,
          price: null,
          attendanceCode: null,
          vimeoUrl: null,
          surveyUrl: null,
          attendanceDeadline,
          isRecurring: true,
          recurrencePattern: 'monthly-first-sunday',
        },
      })

      createdEvents.push({
        id: event.id,
        title: event.title,
        date: event.date.toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      message: `${createdEvents.length}件のイベントを生成しました`,
      events: createdEvents,
    })
  } catch (error) {
    console.error('[CRON_GENERATE_EVENTS_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'イベント生成に失敗しました' },
      { status: 500 }
    )
  }
}

function getNextFirstSundayOfMonth(monthsAhead: number): Date {
  const now = new Date()
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1)
  const firstDay = new Date(targetMonth)
  const dayOfWeek = firstDay.getDay()
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
  firstDay.setDate(firstDay.getDate() + daysUntilSunday)
  return firstDay
}
