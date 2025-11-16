import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const userId = authUser!.id
    const body = await request.json()
    const { courseId, lessonId, isCompleted } = body

    if (!courseId || !lessonId) {
      return NextResponse.json(
        { success: false, error: 'courseId と lessonId は必須です' },
        { status: 400 }
      )
    }

    // コースが存在するか確認
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'コースが見つかりません' },
        { status: 404 }
      )
    }

    // レッスンが存在するか確認
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    })

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'レッスンが見つかりません' },
        { status: 404 }
      )
    }

    // 進捗を記録（upsert: 存在すれば更新、なければ作成）
    const progress = await prisma.courseProgress.upsert({
      where: {
        userId_courseId_lessonId: {
          userId,
          courseId,
          lessonId,
        },
      },
      update: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
      create: {
        userId,
        courseId,
        lessonId,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      progress: {
        id: progress.id,
        courseId: progress.courseId,
        lessonId: progress.lessonId,
        isCompleted: progress.isCompleted,
        completedAt: progress.completedAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error('[COURSE_PROGRESS_POST_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '進捗の記録に失敗しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const userId = authUser!.id
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    // 進捗を取得
    const where: any = { userId }
    if (courseId) {
      where.courseId = courseId
    }

    const progressList = await prisma.courseProgress.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            order: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    })

    const formattedProgress = progressList.map((p) => ({
      id: p.id,
      courseId: p.courseId,
      lessonId: p.lessonId,
      isCompleted: p.isCompleted,
      completedAt: p.completedAt?.toISOString() ?? null,
      lesson: p.lesson
        ? {
            id: p.lesson.id,
            title: p.lesson.title,
            order: p.lesson.order,
          }
        : null,
    }))

    return NextResponse.json({ success: true, progress: formattedProgress })
  } catch (error) {
    console.error('[COURSE_PROGRESS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '進捗の取得に失敗しました' },
      { status: 500 }
    )
  }
}
