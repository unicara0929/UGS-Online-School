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
      // Vimeo IDとハッシュを抽出（URLまたは数値のみの場合）
      let vimeoId: string | null = null
      let vimeoHash: string | null = null
      if (lesson.videoUrl) {
        const trimmedUrl = lesson.videoUrl.trim()
        // 数値のみの場合はそのまま使用
        if (/^\d+$/.test(trimmedUrl)) {
          vimeoId = trimmedUrl
        } else {
          // URLからVimeo IDを抽出（vimeo.com/123456 または player.vimeo.com/video/123456 形式に対応）
          // プライベートリンクの形式: vimeo.com/123456789/abc123def または vimeo.com/123456789?h=abc123def
          const idMatch = trimmedUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/)
          vimeoId = idMatch?.[1] || null

          // ハッシュを抽出（/video_id/hash 形式または ?h=hash 形式）
          if (vimeoId) {
            // パス形式: vimeo.com/123456789/abc123def
            const pathHashMatch = trimmedUrl.match(/vimeo\.com\/\d+\/([a-zA-Z0-9]+)/)
            // クエリパラメータ形式: ?h=abc123def
            const queryHashMatch = trimmedUrl.match(/[?&]h=([a-zA-Z0-9]+)/)
            vimeoHash = pathHashMatch?.[1] || queryHashMatch?.[1] || null
          }
        }
      }

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
        vimeoHash,
        thumbnailUrl: lesson.thumbnailUrl,
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
