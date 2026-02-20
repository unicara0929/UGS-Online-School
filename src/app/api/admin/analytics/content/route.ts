import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * コンテンツ分析データを取得
 * GET /api/admin/analytics/content
 * 権限: MANAGER以上
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // MANAGER以上のロールチェック
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.MANAGER_AND_ABOVE)
    if (roleError) return roleError

    // 並列でデータ取得
    const [
      courses,
      courseProgressData,
      lessonProgressData,
      contentViews,
      events,
      eventRegistrations,
      monthlyViews,
    ] = await Promise.all([
      // 全コース（公開済み）
      prisma.course.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          category: true,
          level: true,
          lessons: {
            where: { isPublished: true },
            select: { id: true },
          },
        },
        orderBy: { order: 'asc' },
      }),

      // コース単位の進捗（isCompleted = true のみ、lessonId = null でコース全体の完了）
      prisma.courseProgress.groupBy({
        by: ['courseId'],
        where: { isCompleted: true, lessonId: null },
        _count: { userId: true },
      }),

      // レッスン単位の進捗
      prisma.courseProgress.groupBy({
        by: ['courseId'],
        where: { lessonId: { not: null } },
        _count: { userId: true },
      }),

      // コンテンツ閲覧数（タイプ別）
      prisma.userContentView.groupBy({
        by: ['contentType', 'contentId'],
        _count: { userId: true },
      }),

      // イベント一覧
      prisma.event.findMany({
        include: {
          schedules: {
            select: { id: true, date: true },
            orderBy: { date: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // イベント登録データ
      prisma.eventRegistration.groupBy({
        by: ['eventId'],
        _count: { userId: true },
        where: {},
      }),

      // 月別コンテンツ閲覧トレンド（過去6ヶ月）
      (() => {
        const months: { month: string; startDate: Date; endDate: Date }[] = []
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
          months.push({
            month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            startDate: d,
            endDate: end,
          })
        }
        return Promise.all(
          months.map(async ({ month, startDate, endDate }) => {
            const [courseViews, eventViews, lessonViews] = await Promise.all([
              prisma.userContentView.count({
                where: {
                  contentType: 'COURSE',
                  firstViewedAt: { gte: startDate, lt: endDate },
                },
              }),
              prisma.userContentView.count({
                where: {
                  contentType: 'EVENT',
                  firstViewedAt: { gte: startDate, lt: endDate },
                },
              }),
              prisma.userContentView.count({
                where: {
                  contentType: 'LESSON',
                  firstViewedAt: { gte: startDate, lt: endDate },
                },
              }),
            ])
            return { month, courseViews, eventViews, lessonViews }
          })
        )
      })(),
    ])

    // コース別閲覧数マップ
    const courseViewMap = new Map<string, number>()
    const lessonViewMap = new Map<string, number>()
    contentViews.forEach((v) => {
      if (v.contentType === 'COURSE') {
        courseViewMap.set(v.contentId, v._count.userId)
      } else if (v.contentType === 'LESSON') {
        lessonViewMap.set(v.contentId, (lessonViewMap.get(v.contentId) || 0) + v._count.userId)
      }
    })

    // コース完了数マップ
    const courseCompletionMap = new Map<string, number>()
    courseProgressData.forEach((p) => {
      courseCompletionMap.set(p.courseId, p._count.userId)
    })

    // コース学習者数マップ（レッスン進捗があるユーザー数）
    const courseLearnerMap = new Map<string, number>()
    lessonProgressData.forEach((p) => {
      courseLearnerMap.set(p.courseId, p._count.userId)
    })

    // イベント登録数マップ
    const eventRegMap = new Map<string, number>()
    eventRegistrations.forEach((r) => {
      eventRegMap.set(r.eventId, r._count.userId)
    })

    // ユニークユーザー数（全体）
    const totalUniqueViewers = await prisma.userContentView.groupBy({
      by: ['userId'],
      _count: true,
    })

    // コース人気ランキング
    const courseRanking = courses.map((course) => {
      const views = courseViewMap.get(course.id) || 0
      const completions = courseCompletionMap.get(course.id) || 0
      const learners = courseLearnerMap.get(course.id) || 0
      const lessonCount = course.lessons.length

      return {
        id: course.id,
        title: course.title,
        category: course.category,
        level: course.level,
        views,
        completions,
        learners,
        lessonCount,
        completionRate: learners > 0 ? Math.round((completions / learners) * 100) : 0,
      }
    }).sort((a, b) => b.views - a.views)

    // イベント参加ランキング
    const eventRanking = events.map((event) => {
      const registrations = eventRegMap.get(event.id) || 0
      const latestSchedule = event.schedules?.[0]
      return {
        id: event.id,
        title: event.title,
        category: event.eventCategory,
        status: event.status,
        registrations,
        date: latestSchedule?.date || null,
      }
    }).sort((a, b) => b.registrations - a.registrations)

    // KPIサマリー
    const totalCourseViews = Array.from(courseViewMap.values()).reduce((a, b) => a + b, 0)
    const totalEventRegistrations = Array.from(eventRegMap.values()).reduce((a, b) => a + b, 0)
    const totalCompletions = Array.from(courseCompletionMap.values()).reduce((a, b) => a + b, 0)
    const avgCompletionRate = courseRanking.length > 0
      ? Math.round(courseRanking.reduce((sum, c) => sum + c.completionRate, 0) / courseRanking.length)
      : 0

    return NextResponse.json({
      kpi: {
        totalCourseViews,
        totalEventRegistrations,
        totalCompletions,
        avgCompletionRate,
        uniqueViewers: totalUniqueViewers.length,
        totalCourses: courses.length,
        totalEvents: events.length,
      },
      courseRanking: courseRanking.slice(0, 20),
      eventRanking: eventRanking.slice(0, 20),
      monthlyTrends: monthlyViews,
    })
  } catch (error) {
    console.error('Content analytics error:', error)
    return NextResponse.json(
      { error: 'コンテンツ分析データの取得に失敗しました' },
      { status: 500 }
    )
  }
}
