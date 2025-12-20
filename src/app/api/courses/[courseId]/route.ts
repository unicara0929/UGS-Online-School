import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params

    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const userId = authUser!.id
    const userRole = authUser!.role

    // コース情報を取得
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
        },
        progress: {
          where: {
            userId,
            lessonId: { not: null },
          },
          select: {
            lessonId: true,
            isCompleted: true,
            completedAt: true,
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'コースが見つかりません' },
        { status: 404 }
      )
    }

    // FPエイド以上のみアクセス可能なコンテンツの制御
    const canAccessFPContent = ['FP', 'MANAGER', 'ADMIN'].includes(userRole)

    if (course.isLocked && !canAccessFPContent) {
      return NextResponse.json(
        { success: false, error: 'このコースにアクセスする権限がありません' },
        { status: 403 }
      )
    }

    // 進捗情報のマップを作成
    const progressMap = new Map(
      course.progress.map((p) => [
        p.lessonId,
        { isCompleted: p.isCompleted, completedAt: p.completedAt },
      ])
    )

    // レスポンス用にフォーマット
    const lessons = course.lessons.map((lesson) => {
      const progress = progressMap.get(lesson.id)
      // Vimeo IDを抽出（URLから）
      const vimeoId = lesson.videoUrl?.match(/vimeo\.com\/(\d+)/)?.[1] || null

      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description ?? '',
        duration: lesson.duration,
        isCompleted: progress?.isCompleted ?? false,
        order: lesson.order,
        content: `このレッスンでは、${lesson.title}について学習します。`,
        videoUrl: lesson.videoUrl,
        vimeoId,
        materials: lesson.pdfUrl ? [lesson.pdfUrl] : [],
      }
    })

    const totalLessons = lessons.length
    const completedLessons = lessons.filter((l) => l.isCompleted).length
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    const formattedCourse = {
      id: course.id,
      title: course.title,
      description: course.description ?? '',
      category: course.category,
      level: course.level,
      lessons,
      progress,
    }

    return NextResponse.json({ success: true, course: formattedCourse })
  } catch (error) {
    console.error('[COURSE_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'コース情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
