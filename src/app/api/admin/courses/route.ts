import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * 管理者用コース一覧取得API
 * すべてのコースとそのレッスン数を取得
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    // すべてのコースを取得（レッスン数を含む）
    const courses = await prisma.course.findMany({
      include: {
        lessons: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            lessons: true
          }
        }
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // レスポンス用にデータを整形
    const coursesWithLessonCount = courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      isLocked: course.isLocked,
      isPublished: course.isPublished,
      order: course.order,
      lessonCount: course._count.lessons,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    }))

    return NextResponse.json({
      success: true,
      courses: coursesWithLessonCount
    })
  } catch (error) {
    console.error('Admin courses list API error:', error)
    return NextResponse.json(
      { error: 'コース一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 管理者用コース作成API
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    const body = await request.json()
    const { title, description, category, level, isLocked, isPublished, order } = body

    // バリデーション
    if (!title) {
      return NextResponse.json(
        { error: 'コースタイトルは必須です' },
        { status: 400 }
      )
    }

    if (!category || !['BASIC', 'ADVANCED', 'PRACTICAL'].includes(category)) {
      return NextResponse.json(
        { error: '有効なカテゴリを選択してください' },
        { status: 400 }
      )
    }

    if (!level || !['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(level)) {
      return NextResponse.json(
        { error: '有効なレベルを選択してください' },
        { status: 400 }
      )
    }

    // コースを作成
    const course = await prisma.course.create({
      data: {
        title,
        description: description || null,
        category,
        level,
        isLocked: isLocked === true,
        isPublished: isPublished !== false, // デフォルトはtrue
        order: order || 0
      }
    })

    console.log('[ADMIN_COURSES] Course created:', {
      courseId: course.id,
      title: course.title,
      by: authUser!.id
    })

    return NextResponse.json({
      success: true,
      course
    })
  } catch (error) {
    console.error('Admin course create API error:', error)
    return NextResponse.json(
      { error: 'コースの作成に失敗しました' },
      { status: 500 }
    )
  }
}
