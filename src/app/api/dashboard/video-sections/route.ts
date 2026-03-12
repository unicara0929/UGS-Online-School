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

    const userId = authUser!.id
    const userRole = authUser!.role

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      continueWatchingRaw,
      weeklyViews,
      monthlyViews,
      allTimeViews,
      ratings,
      newVideosRaw,
    ] = await Promise.all([
      // 続きを見る
      prisma.courseProgress.findMany({
        where: {
          userId,
          currentTime: { gt: 0 },
          isCompleted: false,
          lessonId: { not: null },
        },
        include: {
          lesson: {
            include: { course: true },
          },
        },
        orderBy: { lastWatchedAt: 'desc' },
        take: 20,
      }),
      // 週間ランキング
      prisma.courseProgress.groupBy({
        by: ['lessonId'],
        where: {
          lastWatchedAt: { gte: weekAgo },
          lessonId: { not: null },
        },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 20,
      }),
      // 月間ランキング
      prisma.courseProgress.groupBy({
        by: ['lessonId'],
        where: {
          lastWatchedAt: { gte: monthAgo },
          lessonId: { not: null },
        },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 20,
      }),
      // 全期間ランキング
      prisma.courseProgress.groupBy({
        by: ['lessonId'],
        where: {
          lessonId: { not: null },
        },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 20,
      }),
      // 評価
      prisma.lessonRating.groupBy({
        by: ['lessonId'],
        _avg: { rating: true },
      }),
      // 新着動画
      prisma.lesson.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          isPublished: true,
          course: { isPublished: true },
        },
        include: { course: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    const ratingMap = new Map(
      ratings.map((r) => [r.lessonId, r._avg.rating])
    )

    // 続きを見る: アクセスフィルタ
    const continueWatching = continueWatchingRaw
      .filter((p) => {
        if (!p.lesson?.course) return false
        return canAccessCourse(p.lesson.course.viewableRoles, p.lesson.course.isLocked, userRole)
          && p.lesson.isPublished && p.lesson.course.isPublished
      })
      .slice(0, 10)
      .map((p) => ({
        lessonId: p.lessonId!,
        courseId: p.lesson!.courseId,
        lessonTitle: p.lesson!.title,
        courseTitle: p.lesson!.course.title,
        thumbnailUrl: getThumbnailUrl(p.lesson!.thumbnailUrl, p.lesson!.videoUrl),
        currentTime: p.currentTime ?? 0,
        videoDuration: p.videoDuration ?? 0,
      }))

    // ランキング用: lessonIdからlesson+course情報を一括取得
    const allRankingLessonIds = new Set([
      ...weeklyViews.map((v) => v.lessonId),
      ...monthlyViews.map((v) => v.lessonId),
      ...allTimeViews.map((v) => v.lessonId),
    ].filter((id): id is string => id !== null))

    const rankingLessons = allRankingLessonIds.size > 0
      ? await prisma.lesson.findMany({
          where: { id: { in: [...allRankingLessonIds] } },
          include: { course: true },
        })
      : []

    const lessonMap = new Map(rankingLessons.map((l) => [l.id, l]))

    // ランキングデータを生成するヘルパー
    function buildRanking(views: { lessonId: string | null; _count: { userId: number } }[]) {
      let rank = 0
      return views
        .filter((v) => {
          if (!v.lessonId) return false
          const lesson = lessonMap.get(v.lessonId)
          if (!lesson?.course) return false
          return canAccessCourse(lesson.course.viewableRoles, lesson.course.isLocked, userRole)
            && lesson.isPublished && lesson.course.isPublished
        })
        .slice(0, 10)
        .map((v) => {
          rank++
          const lesson = lessonMap.get(v.lessonId!)!
          return {
            rank,
            lessonId: v.lessonId!,
            courseId: lesson.courseId,
            lessonTitle: lesson.title,
            courseTitle: lesson.course.title,
            thumbnailUrl: getThumbnailUrl(lesson.thumbnailUrl, lesson.videoUrl),
            avgRating: ratingMap.get(v.lessonId!) ?? null,
          }
        })
    }

    const popularRanking = {
      weekly: buildRanking(weeklyViews),
      monthly: buildRanking(monthlyViews),
      allTime: buildRanking(allTimeViews),
    }

    // 新着動画: アクセスフィルタ
    const newVideos = newVideosRaw
      .filter((l) => canAccessCourse(l.course.viewableRoles, l.course.isLocked, userRole))
      .slice(0, 10)
      .map((l) => ({
        lessonId: l.id,
        courseId: l.courseId,
        lessonTitle: l.title,
        courseTitle: l.course.title,
        thumbnailUrl: getThumbnailUrl(l.thumbnailUrl, l.videoUrl),
        createdAt: l.createdAt.toISOString(),
      }))

    return NextResponse.json({
      success: true,
      continueWatching,
      popularRanking,
      newVideos,
    })
  } catch (error) {
    console.error('[VIDEO_SECTIONS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '動画セクション情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
