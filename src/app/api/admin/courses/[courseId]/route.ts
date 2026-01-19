import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * 管理者用コース詳細取得API
 * コースとそのレッスン一覧を取得
 */
export async function GET(
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

    // コースとレッスン一覧を取得
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: {
          orderBy: [
            { order: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      course
    })
  } catch (error) {
    console.error('Admin course detail API error:', error)
    return NextResponse.json(
      { error: 'コース詳細の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 管理者用コース更新API
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
    const { title, description, category, level, isLocked, viewableRoles, isPublished, order } = body

    // バリデーション
    if (title !== undefined && !title) {
      return NextResponse.json(
        { error: 'コースタイトルは必須です' },
        { status: 400 }
      )
    }

    if (category !== undefined && !['BASIC', 'ADVANCED', 'PRACTICAL'].includes(category)) {
      return NextResponse.json(
        { error: '有効なカテゴリを選択してください' },
        { status: 400 }
      )
    }

    if (level !== undefined && !['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(level)) {
      return NextResponse.json(
        { error: '有効なレベルを選択してください' },
        { status: 400 }
      )
    }

    // 更新データを準備
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (level !== undefined) updateData.level = level
    if (isLocked !== undefined) updateData.isLocked = isLocked
    if (viewableRoles !== undefined) {
      updateData.viewableRoles = viewableRoles
      // viewableRolesが設定された場合（空配列含む）、isLockedは無効化
      // 空配列 = 全員閲覧可能なのでisLocked=falseにする
      updateData.isLocked = false
    }
    if (isPublished !== undefined) updateData.isPublished = isPublished
    if (order !== undefined) updateData.order = order

    // コースを更新
    const course = await prisma.course.update({
      where: { id: courseId },
      data: updateData
    })

    console.log('[ADMIN_COURSES] Course updated:', {
      courseId: course.id,
      title: course.title,
      by: authUser!.id
    })

    return NextResponse.json({
      success: true,
      course
    })
  } catch (error: any) {
    console.error('Admin course update API error:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'コースの更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 管理者用コース削除API
 */
export async function DELETE(
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

    // コースを削除（Cascade設定により関連するレッスンも削除される）
    await prisma.course.delete({
      where: { id: courseId }
    })

    console.log('[ADMIN_COURSES] Course deleted:', {
      courseId,
      by: authUser!.id
    })

    return NextResponse.json({
      success: true,
      message: 'コースを削除しました'
    })
  } catch (error: any) {
    console.error('Admin course delete API error:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'コースの削除に失敗しました' },
      { status: 500 }
    )
  }
}
