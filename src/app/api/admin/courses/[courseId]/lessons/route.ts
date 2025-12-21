import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'
import { extractVimeoVideoId, fetchVimeoVideoInfo, normalizeVimeoUrl } from '@/lib/vimeo'

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

    // Vimeo URLまたはIDのバリデーションと動画時間の自動取得
    let processedVideoUrl: string | null = null
    let finalDuration = duration

    if (videoUrl) {
      const videoId = extractVimeoVideoId(videoUrl)
      if (!videoId) {
        return NextResponse.json(
          { error: '有効なVimeo URLまたはVideo IDを入力してください（例: https://vimeo.com/123456789 または 123456789）' },
          { status: 400 }
        )
      }
      // 正規化されたVimeo URLを保存
      processedVideoUrl = normalizeVimeoUrl(videoUrl)

      // duration が指定されていない場合、Vimeo APIから自動取得
      if (finalDuration === undefined || finalDuration === 0) {
        const videoInfo = await fetchVimeoVideoInfo(videoId)
        if (videoInfo) {
          finalDuration = videoInfo.duration
          console.log('[ADMIN_LESSONS] Auto-fetched duration from Vimeo:', finalDuration)
        } else {
          // Vimeoから取得できない場合はデフォルト値を設定
          finalDuration = 0
          console.warn('[ADMIN_LESSONS] Could not fetch duration from Vimeo, using default')
        }
      }
    }

    // duration がまだ undefined の場合はデフォルト値を設定
    if (finalDuration === undefined) {
      finalDuration = 0
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
        duration: finalDuration,
        order: order || 0,
        videoUrl: processedVideoUrl,
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
