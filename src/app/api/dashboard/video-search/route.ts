import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { MaterialViewableRole } from '@prisma/client'

// ユーザーロールをMaterialViewableRoleに変換
function userRoleToViewableRole(role: string): MaterialViewableRole {
  switch (role) {
    case 'ADMIN': return 'ADMIN'
    case 'MANAGER': return 'MANAGER'
    case 'FP': return 'FP'
    case 'FP_AIDE': return 'FP'
    case 'MEMBER':
    default: return 'MEMBER'
  }
}

// コースにアクセス可能か判定
function canAccessCourse(
  viewableRoles: MaterialViewableRole[],
  isLocked: boolean,
  userRole: string
): boolean {
  if (viewableRoles && viewableRoles.length > 0) {
    const userViewableRole = userRoleToViewableRole(userRole)
    return viewableRoles.includes(userViewableRole)
  }
  if (isLocked) {
    return ['FP_AIDE', 'FP', 'MANAGER', 'ADMIN'].includes(userRole)
  }
  return true
}

// videoUrlからVimeo IDを抽出
function extractVimeoId(videoUrl: string | null): string | null {
  if (!videoUrl) return null
  const trimmed = videoUrl.trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  const match = trimmed.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/)
  return match?.[1] || null
}

// サムネイルURLを生成
function getThumbnailUrl(thumbnailUrl: string | null, videoUrl: string | null): string | null {
  if (thumbnailUrl) return thumbnailUrl
  const vimeoId = extractVimeoId(videoUrl)
  if (vimeoId) return `https://vumbnail.com/${vimeoId}.jpg`
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const userRole = authUser!.role

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    // レッスンのtitle/descriptionとコースのtitleで検索
    const lessons = await prisma.lesson.findMany({
      where: {
        isPublished: true,
        course: { isPublished: true },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { course: { title: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: { course: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    // アクセスフィルタ
    const results = lessons
      .filter((l) => canAccessCourse(l.course.viewableRoles, l.course.isLocked, userRole))
      .slice(0, 20)
      .map((l) => ({
        lessonId: l.id,
        courseId: l.courseId,
        lessonTitle: l.title,
        courseTitle: l.course.title,
        thumbnailUrl: getThumbnailUrl(l.thumbnailUrl, l.videoUrl),
        duration: l.duration,
      }))

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('[VIDEO_SEARCH_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '動画検索に失敗しました' },
      { status: 500 }
    )
  }
}
