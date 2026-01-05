import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'
import { extractVimeoVideoId, fetchVimeoVideoInfo, normalizeVimeoUrl } from '@/lib/vimeo'

/**
 * 管理者用レッスン更新API
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    const { lessonId } = await context.params
    const body = await request.json()
    const { title, description, duration, order, videoUrl, pdfUrl, isPublished } = body

    // バリデーション
    if (title !== undefined && !title) {
      return NextResponse.json(
        { error: 'レッスンタイトルは必須です' },
        { status: 400 }
      )
    }

    if (duration !== undefined && duration < 0) {
      return NextResponse.json(
        { error: '有効な動画時間（秒）を入力してください' },
        { status: 400 }
      )
    }

    // 更新データを準備
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (duration !== undefined) updateData.duration = duration
    if (order !== undefined) updateData.order = order
    if (pdfUrl !== undefined) updateData.pdfUrl = pdfUrl
    if (isPublished !== undefined) updateData.isPublished = isPublished

    // Vimeo URLの処理と動画時間・サムネイルの自動取得
    if (videoUrl !== undefined) {
      if (videoUrl) {
        const videoId = extractVimeoVideoId(videoUrl)
        if (!videoId) {
          return NextResponse.json(
            { error: '有効なVimeo URLまたはVideo IDを入力してください（例: https://vimeo.com/123456789 または 123456789）' },
            { status: 400 }
          )
        }

        // 正規化されたVimeo URLを保存
        const normalizedUrl = normalizeVimeoUrl(videoUrl)
        updateData.videoUrl = normalizedUrl

        // 既存のレッスンを取得して、videoUrlが変更されたかチェック
        const existingLesson = await prisma.lesson.findUnique({
          where: { id: lessonId },
          select: { videoUrl: true, thumbnailUrl: true }
        })

        const isVideoUrlChanged = existingLesson?.videoUrl !== normalizedUrl

        // videoUrlが変更された場合、またはduration/サムネイルが未設定の場合はVimeo APIから自動取得
        if (isVideoUrlChanged || duration === undefined || duration === 0 || !existingLesson?.thumbnailUrl) {
          const videoInfo = await fetchVimeoVideoInfo(videoId)
          if (videoInfo) {
            if (isVideoUrlChanged || duration === undefined || duration === 0) {
              updateData.duration = videoInfo.duration
            }
            // サムネイルURLを更新
            if (videoInfo.thumbnailUrl) {
              updateData.thumbnailUrl = videoInfo.thumbnailUrl
              console.log('[ADMIN_LESSONS] Auto-fetched thumbnail from Vimeo:', videoInfo.thumbnailUrl)
            }
          }
        }
      } else {
        updateData.videoUrl = null
        updateData.thumbnailUrl = null
      }
    }

    // レッスンを更新
    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: updateData
    })

    console.log('[ADMIN_LESSONS] Lesson updated:', {
      lessonId: lesson.id,
      title: lesson.title,
      by: authUser!.id
    })

    return NextResponse.json({
      success: true,
      lesson
    })
  } catch (error: any) {
    console.error('Admin lesson update API error:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'レッスンが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'レッスンの更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 管理者用レッスン削除API
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    const { lessonId } = await context.params

    // レッスンを削除
    await prisma.lesson.delete({
      where: { id: lessonId }
    })

    console.log('[ADMIN_LESSONS] Lesson deleted:', {
      lessonId,
      by: authUser!.id
    })

    return NextResponse.json({
      success: true,
      message: 'レッスンを削除しました'
    })
  } catch (error: any) {
    console.error('Admin lesson delete API error:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'レッスンが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'レッスンの削除に失敗しました' },
      { status: 500 }
    )
  }
}
