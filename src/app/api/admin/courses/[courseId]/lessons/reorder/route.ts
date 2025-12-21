import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * 管理者用レッスン並び替えAPI
 * レッスンの順序を一括更新
 */
export async function PUT(
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
    const { lessonIds } = body as { lessonIds: string[] }

    if (!lessonIds || !Array.isArray(lessonIds)) {
      return NextResponse.json(
        { error: 'lessonIds配列が必要です' },
        { status: 400 }
      )
    }

    // コースの存在確認
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { lessons: true }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      )
    }

    // 全てのレッスンがこのコースに属しているか確認
    const courseLessonIds = new Set(course.lessons.map(l => l.id))
    for (const lessonId of lessonIds) {
      if (!courseLessonIds.has(lessonId)) {
        return NextResponse.json(
          { error: '不正なレッスンIDが含まれています' },
          { status: 400 }
        )
      }
    }

    // トランザクションで一括更新
    await prisma.$transaction(
      lessonIds.map((lessonId, index) =>
        prisma.lesson.update({
          where: { id: lessonId },
          data: { order: index + 1 }
        })
      )
    )

    console.log('[ADMIN_LESSONS] Lessons reordered:', {
      courseId,
      lessonCount: lessonIds.length,
      by: authUser!.id
    })

    return NextResponse.json({
      success: true,
      message: 'レッスンの順序を更新しました'
    })
  } catch (error) {
    console.error('Admin lesson reorder API error:', error)
    return NextResponse.json(
      { error: 'レッスンの並び替えに失敗しました' },
      { status: 500 }
    )
  }
}
