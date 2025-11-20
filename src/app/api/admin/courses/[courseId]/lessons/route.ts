import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * Vimeo URLからVideo IDを抽出するヘルパー関数
 * @param urlOrId VimeoのURLまたはVideo ID
 * @returns Video ID（数値文字列）またはnull
 */
function extractVimeoVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null

  // 既に数値のみの場合はそのまま返す
  if (/^\d+$/.test(urlOrId)) {
    return urlOrId
  }

  // Vimeo URLからVideo IDを抽出
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ]

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * 管理者用レッスン作成API
 * 指定されたコースに新しいレッスンを追加
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    const { courseId } = await context.params
    const body = await request.json()
    const { title, description, duration, order, videoUrl, pdfUrl, isPublished } = body

    // バリデーション
    if (!title) {
      return NextResponse.json(
        { error: 'レッスンタイトルは必須です' },
        { status: 400 }
      )
    }

    if (duration === undefined || duration < 0) {
      return NextResponse.json(
        { error: '有効な動画時間（秒）を入力してください' },
        { status: 400 }
      )
    }

    // Vimeo URLまたはIDのバリデーション
    let processedVideoUrl = videoUrl
    if (videoUrl) {
      const videoId = extractVimeoVideoId(videoUrl)
      if (!videoId) {
        return NextResponse.json(
          { error: '有効なVimeo URLまたはVideo IDを入力してください（例: https://vimeo.com/123456789 または 123456789）' },
          { status: 400 }
        )
      }
      // 正規化されたVimeo URLを保存
      processedVideoUrl = `https://player.vimeo.com/video/${videoId}`
    }

    // コースの存在確認
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      )
    }

    // レッスンを作成
    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title,
        description: description || null,
        duration,
        order: order || 0,
        videoUrl: processedVideoUrl || null,
        pdfUrl: pdfUrl || null,
        isPublished: isPublished !== false // デフォルトはtrue
      }
    })

    console.log('[ADMIN_LESSONS] Lesson created:', {
      lessonId: lesson.id,
      courseId,
      title: lesson.title,
      by: authUser!.id
    })

    return NextResponse.json({
      success: true,
      lesson
    })
  } catch (error) {
    console.error('Admin lesson create API error:', error)
    return NextResponse.json(
      { error: 'レッスンの作成に失敗しました' },
      { status: 500 }
    )
  }
}
