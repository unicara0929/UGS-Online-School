import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

const CATEGORY_MAP = {
  BASIC: 'income',
  PRACTICAL: 'lifestyle',
  ADVANCED: 'startup',
} as const

const LEVEL_MAP = {
  BEGINNER: 'basic',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const userId = authUser!.id
    const userRole = authUser!.role

    // コース一覧を取得
    const courses = await prisma.course.findMany({
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            order: true,
          },
        },
        progress: {
          where: {
            userId,
            lessonId: { not: null },
            isCompleted: true,
          },
          select: {
            lessonId: true,
            isCompleted: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // FPエイド以上のみアクセス可能なコンテンツの制御
    const canAccessFPContent = ['FP', 'MANAGER', 'ADMIN'].includes(userRole)

    // レスポンス用にフォーマット
    const formattedCourses = courses.map((course) => {
      const completedLessonIds = new Set(
        course.progress.map((p) => p.lessonId).filter((id): id is string => id !== null)
      )

      const lessons = course.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description ?? '',
        duration: lesson.duration,
        isCompleted: completedLessonIds.has(lesson.id),
        order: lesson.order,
      }))

      const totalLessons = lessons.length
      const completedLessons = lessons.filter((l) => l.isCompleted).length
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

      return {
        id: course.id,
        title: course.title,
        description: course.description ?? '',
        category: CATEGORY_MAP[course.category] ?? 'income',
        level: LEVEL_MAP[course.level] ?? 'basic',
        lessons,
        isLocked: course.isLocked && !canAccessFPContent,
        progress,
      }
    })

    return NextResponse.json({ success: true, courses: formattedCourses })
  } catch (error) {
    console.error('[COURSES_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'コース情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
