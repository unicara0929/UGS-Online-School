import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { MaterialViewableRole } from '@prisma/client'

// NEW判定の日数
const NEW_BADGE_DAYS = 7

// ユーザーロールをMaterialViewableRoleに変換
function userRoleToViewableRole(role: string): MaterialViewableRole {
  switch (role) {
    case 'ADMIN': return 'ADMIN'
    case 'MANAGER': return 'MANAGER'
    case 'FP': return 'FP'
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
  // viewableRolesが設定されている場合はそれを使用
  if (viewableRoles && viewableRoles.length > 0) {
    const userViewableRole = userRoleToViewableRole(userRole)
    return viewableRoles.includes(userViewableRole)
  }

  // viewableRolesが空の場合、旧ロジック（isLockedフィールド）を使用
  // isLocked=true の場合はFPエイド以上のみアクセス可能
  if (isLocked) {
    return ['FP', 'MANAGER', 'ADMIN'].includes(userRole)
  }

  // それ以外は全員アクセス可能
  return true
}

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const userId = authUser!.id
    const userRole = authUser!.role

    // UGS会員（MEMBER）のみスタートアップガイドを表示
    const isMember = userRole === 'MEMBER'

    // コース一覧を取得
    const courses = await prisma.course.findMany({
      where: {
        // スタートアップガイドはMEMBERのみに表示、他ロールには非表示
        ...(isMember
          ? {} // MEMBERは全カテゴリー表示
          : { category: { not: 'STARTUP_GUIDE' } } // 他ロールはSTARTUP_GUIDEを除外
        ),
      },
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
      orderBy: [
        { category: 'asc' }, // カテゴリー順（STARTUP_GUIDEが先頭に来るよう調整）
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    // ユーザーのコース閲覧履歴を取得
    const viewedCourseIds = (await prisma.userContentView.findMany({
      where: {
        userId,
        contentType: 'COURSE',
      },
      select: { contentId: true },
    })).map((v) => v.contentId)

    // NEW判定の基準日時
    const newBadgeThreshold = new Date()
    newBadgeThreshold.setDate(newBadgeThreshold.getDate() - NEW_BADGE_DAYS)

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

      // NEW判定: 7日以内に更新され、かつユーザーがまだ閲覧していない
      const isNew = course.updatedAt >= newBadgeThreshold && !viewedCourseIds.includes(course.id)

      // アクセス可能かどうか判定
      const hasAccess = canAccessCourse(course.viewableRoles, course.isLocked, userRole)

      return {
        id: course.id,
        title: course.title,
        description: course.description ?? '',
        category: course.category,
        level: course.level,
        lessons,
        isLocked: !hasAccess,
        viewableRoles: course.viewableRoles,
        progress,
        isNew,
        updatedAt: course.updatedAt.toISOString(),
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
