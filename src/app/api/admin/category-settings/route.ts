import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * 管理者用カテゴリ設定取得API
 */
export async function GET(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    const settings = await prisma.categorySetting.findMany({
      orderBy: { category: 'asc' }
    })

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Admin category settings GET error:', error)
    return NextResponse.json(
      { error: 'カテゴリ設定の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 管理者用カテゴリ設定更新API（upsert）
 */
export async function PUT(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    const body = await request.json()
    const { category, description } = body

    if (!category) {
      return NextResponse.json(
        { error: 'カテゴリは必須です' },
        { status: 400 }
      )
    }

    const setting = await prisma.categorySetting.upsert({
      where: { category },
      update: { description },
      create: { category, description }
    })

    return NextResponse.json({ success: true, setting })
  } catch (error) {
    console.error('Admin category settings PUT error:', error)
    return NextResponse.json(
      { error: 'カテゴリ設定の更新に失敗しました' },
      { status: 500 }
    )
  }
}
