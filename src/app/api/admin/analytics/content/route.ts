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
      courseCompletionData,
      courseLearnerData,
      events,
      eventRegistrations,
      monthlyLearning,
      totalActiveLearners,
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

      // コース修了数（isCompleted = true かつ lessonId = null でコース全体の完了）
      prisma.courseProgress.groupBy({
        by: ['courseId'],
        where: { isCompleted: true, lessonId: null },
        _count: { userId: true },
      }),

      // コース別のユニーク学習者数（CourseProgressにレコードがあるユーザー = 学習開始済み）
      prisma.courseProgress.groupBy({
        by: ['courseId', 'userId'],
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
      }),

      // 月別学習アクティビティ（過去6ヶ月）- CourseProgressとEventRegistrationベース
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
            const [lessonProgress, eventRegs] = await Promise.all([
              // その月にレッスン進捗が更新されたユニークユーザー数
              prisma.courseProgress.groupBy({
                by: ['userId'],
                where: {
                  updatedAt: { gte: startDate, lt: endDate },
                },
              }),
              // その月のイベント登録数
              prisma.eventRegistration.count({
                where: {
                  createdAt: { gte: startDate, lt: endDate },
                },
              }),
            ])
            return {
              month,
              activeLearners: lessonProgress.length,
              eventRegistrations: eventRegs,
            }
          })
        )
      })(),

      // 全体のユニーク学習者数（CourseProgressにレコードがあるユーザー）
      prisma.courseProgress.groupBy({
        by: ['userId'],
      }),
    ])

    // コース別ユニーク学習者数マップ
    const courseLearnerMap = new Map<string, number>()
    courseLearnerData.forEach((p) => {
      courseLearnerMap.set(p.courseId, (courseLearnerMap.get(p.courseId) || 0) + 1)
    })

    // コース修了数マップ
    const courseCompletionMap = new Map<string, number>()
    courseCompletionData.forEach((p) => {
      courseCompletionMap.set(p.courseId, p._count.userId)
    })

    // イベント登録数マップ
    const eventRegMap = new Map<string, number>()
    eventRegistrations.forEach((r) => {
      eventRegMap.set(r.eventId, r._count.userId)
    })

    // コース人気ランキング（学習者数順）
    const courseRanking = courses.map((course) => {
      const learners = courseLearnerMap.get(course.id) || 0
      const completions = courseCompletionMap.get(course.id) || 0
      const lessonCount = course.lessons.length

      return {
        id: course.id,
        title: course.title,
        category: course.category,
        level: course.level,
        learners,
        completions,
        lessonCount,
        completionRate: learners > 0 ? Math.round((completions / learners) * 100) : 0,
      }
    }).sort((a, b) => b.learners - a.learners)

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
    const totalLearners = totalActiveLearners.length
    const totalEventRegistrations = Array.from(eventRegMap.values()).reduce((a, b) => a + b, 0)
    const totalCompletions = Array.from(courseCompletionMap.values()).reduce((a, b) => a + b, 0)
    const coursesWithLearners = courseRanking.filter(c => c.learners > 0)
    const avgCompletionRate = coursesWithLearners.length > 0
      ? Math.round(coursesWithLearners.reduce((sum, c) => sum + c.completionRate, 0) / coursesWithLearners.length)
      : 0

    return NextResponse.json({
      kpi: {
        totalLearners,
        totalEventRegistrations,
        totalCompletions,
        avgCompletionRate,
        totalCourses: courses.length,
        totalEvents: events.length,
      },
      courseRanking: courseRanking.slice(0, 20),
      eventRanking: eventRanking.slice(0, 20),
      monthlyTrends: monthlyLearning,
    })
  } catch (error) {
    console.error('Content analytics error:', error)
    return NextResponse.json(
      { error: 'コンテンツ分析データの取得に失敗しました' },
      { status: 500 }
    )
  }
}
