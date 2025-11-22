import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// カテゴリ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { categoryId } = await params
    const body = await request.json()
    const { name, description, order, isActive } = body

    const category = await prisma.fAQCategory.update({
      where: { id: categoryId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ success: true, category })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ success: false, error: 'カテゴリの更新に失敗しました' }, { status: 500 })
  }
}

// カテゴリ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { categoryId } = await params

    // カテゴリ内のFAQ数を確認
    const faqCount = await prisma.fAQ.count({
      where: { categoryId },
    })

    if (faqCount > 0) {
      return NextResponse.json(
        { success: false, error: 'このカテゴリにはFAQが存在するため削除できません。先にFAQを削除してください。' },
        { status: 400 }
      )
    }

    await prisma.fAQCategory.delete({
      where: { id: categoryId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ success: false, error: 'カテゴリの削除に失敗しました' }, { status: 500 })
  }
}
