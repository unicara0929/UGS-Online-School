import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * マネージャーが担当FPエイドの視聴済みレッスン一覧を取得
 * GET /api/team/members/[userId]/completed-lessons
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const authUserId = authUser!.id
    const userRole = authUser!.role

    // MANAGER または ADMIN のみアクセス可能
    if (!['MANAGER', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'この機能にアクセスする権限がありません' },
        { status: 403 }
      )
    }

    // マネージャーの場合、担当FPエイドかどうか確認
    if (userRole === 'MANAGER') {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { managerId: true }
      })

      if (!targetUser || targetUser.managerId !== authUserId) {
        return NextResponse.json(
          { success: false, error: 'このユーザーの情報を閲覧する権限がありません' },
          { status: 403 }
        )
      }
    }

    // 視聴済みレッスンを取得（レッスンとコース情報を含む）
    const completedLessons = await prisma.courseProgress.findMany({
      where: {
        userId,
        isCompleted: true,
        lessonId: { not: null }
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            order: true,
            course: {
              select: {
                id: true,
                title: true,
                category: true,
                level: true
              }
            }
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    })

    // カテゴリラベルのマッピング
    const categoryLabels: Record<string, string> = {
      'finance_basics': 'お金の基礎',
      'fp_knowledge': 'FP知識',
      'sales_skills': 'セールススキル',
      'business_mindset': 'ビジネスマインドセット',
      'business_tools': 'ビジネスツール',
      'fp_aid_onboarding': 'FPエイドオンボーディング',
      'startup_support': 'スタートアップ支援',
      'app_usage': 'アプリの使い方',
      'ugs_basics': 'UGS基礎'
    }

    // レベルラベルのマッピング
    const levelLabels: Record<string, string> = {
      'BEGINNER': '基礎',
      'INTERMEDIATE': '応用',
      'ADVANCED': '上級'
    }

    // レスポンス用にフォーマット
    const lessons = completedLessons
      .filter(progress => progress.lesson) // lessonがnullでないものだけ
      .map(progress => ({
        id: progress.id,
        lessonId: progress.lessonId,
        lessonTitle: progress.lesson!.title,
        lessonOrder: progress.lesson!.order,
        courseId: progress.lesson!.course.id,
        courseTitle: progress.lesson!.course.title,
        category: progress.lesson!.course.category,
        categoryLabel: categoryLabels[progress.lesson!.course.category] || progress.lesson!.course.category,
        level: progress.lesson!.course.level,
        levelLabel: levelLabels[progress.lesson!.course.level] || progress.lesson!.course.level,
        completedAt: progress.completedAt?.toISOString() || null
      }))

    return NextResponse.json({
      success: true,
      user: user ? { name: user.name, email: user.email } : null,
      totalCount: lessons.length,
      lessons
    })
  } catch (error) {
    console.error('[COMPLETED_LESSONS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '視聴済みレッスン情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
