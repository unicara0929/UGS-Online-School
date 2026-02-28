import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { isAdmin, error: adminError } = checkAdmin(user!.role)
    if (adminError) return adminError

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    // コース一覧を取得（レッスンと評価を含む）
    const courses = await prisma.course.findMany({
      where: courseId ? { id: courseId } : { isPublished: true },
      include: {
        lessons: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          include: {
            ratings: {
              select: {
                rating: true,
                comment: true,
                createdAt: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const coursesWithStats = courses.map((course) => {
      // コース全体の評価を集計
      const allRatings = course.lessons.flatMap((l) => l.ratings)
      const totalRatings = allRatings.length
      const avgRating =
        totalRatings > 0
          ? Math.round(
              (allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings) * 10
            ) / 10
          : 0

      // 星1〜5の分布
      const distribution = [0, 0, 0, 0, 0]
      allRatings.forEach((r) => {
        distribution[r.rating - 1]++
      })

      // レッスン別の集計
      const lessons = course.lessons.map((lesson) => {
        const lessonTotalRatings = lesson.ratings.length
        const lessonAvgRating =
          lessonTotalRatings > 0
            ? Math.round(
                (lesson.ratings.reduce((sum, r) => sum + r.rating, 0) /
                  lessonTotalRatings) *
                  10
              ) / 10
            : 0

        const lessonDistribution = [0, 0, 0, 0, 0]
        lesson.ratings.forEach((r) => {
          lessonDistribution[r.rating - 1]++
        })

        // 低評価コメント（星1-2）
        const lowRatingComments = lesson.ratings
          .filter((r) => r.rating <= 2 && r.comment)
          .map((r) => ({
            rating: r.rating,
            comment: r.comment!,
            userName: r.user.name,
            createdAt: r.createdAt.toISOString(),
          }))

        return {
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          avgRating: lessonAvgRating,
          totalRatings: lessonTotalRatings,
          distribution: lessonDistribution,
          lowRatingComments,
        }
      })

      return {
        id: course.id,
        title: course.title,
        avgRating,
        totalRatings,
        distribution,
        lessons,
      }
    })

    return NextResponse.json({ success: true, courses: coursesWithStats })
  } catch (error) {
    console.error('[ADMIN_RATINGS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '評価データの取得に失敗しました' },
      { status: 500 }
    )
  }
}
