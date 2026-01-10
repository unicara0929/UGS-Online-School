import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 定期イベントを一括生成するAPI（初回セットアップ用）
 * POST /api/admin/events/generate-recurring-bulk
 *
 * 指定月数先までの全体MTGイベントを一括生成します（デフォルト来月分まで）。
 * 既存のイベントがある月はスキップします。
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const { monthsAhead = 1 } = body || {} // デフォルト来月分まで

    const createdEvents = []
    const skippedEvents = []

    // 各月の第1日曜日を計算して作成
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
        console.log(`Event already exists for ${targetDate.toISOString()}`)
        skippedEvents.push({
          date: targetDate.toISOString(),
          reason: 'Already exists',
        })
        continue
      }

      // イベント開始時刻を設定
      const eventStart = new Date(targetDate)
      eventStart.setHours(19, 0, 0, 0) // 19:00 JST

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
          // 出席確認関連（後から管理者が設定）
          attendanceCode: null,
          vimeoUrl: null,
          surveyUrl: null,
          // 定期開催設定
          isRecurring: true,
          recurrencePattern: 'monthly-first-sunday',
        },
      })

      createdEvents.push({
        id: event.id,
        title: event.title,
        date: event.date.toISOString(),
        time: event.time,
      })
    }

    return NextResponse.json({
      success: true,
      message: `${createdEvents.length}件のイベントを作成しました（${skippedEvents.length}件スキップ）`,
      created: createdEvents,
      skipped: skippedEvents,
    })
  } catch (error) {
    console.error('[GENERATE_RECURRING_BULK_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '定期イベントの一括生成に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 指定した月数先の第1日曜日を取得
 * @param monthsAhead 何ヶ月先か（0 = 今月, 1 = 来月, 2 = 再来月, ...）
 */
function getNextFirstSundayOfMonth(monthsAhead: number): Date {
  const now = new Date()
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1)

  // 月の1日から日曜日を探す
  const firstDay = new Date(targetMonth)
  const dayOfWeek = firstDay.getDay()

  // 0 = 日曜日の場合はそのまま、それ以外は次の日曜日まで進める
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek

  firstDay.setDate(firstDay.getDate() + daysUntilSunday)

  return firstDay
}
