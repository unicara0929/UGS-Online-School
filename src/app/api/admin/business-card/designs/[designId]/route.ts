import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// 名刺デザイン更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ designId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { designId } = await params
    const body = await request.json()
    const { name, description, previewUrl, isActive, order } = body

    const updateData: any = {}

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          { success: false, error: 'デザイン名を入力してください' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }
    if (description !== undefined) updateData.description = description?.trim() || null
    if (previewUrl !== undefined) updateData.previewUrl = previewUrl?.trim() || null
    if (isActive !== undefined) updateData.isActive = isActive
    if (order !== undefined) updateData.order = order

    const design = await prisma.businessCardDesign.update({
      where: { id: designId },
      data: updateData,
    })

    return NextResponse.json({ success: true, design })
  } catch (error) {
    console.error('Error updating business card design:', error)
    return NextResponse.json({ success: false, error: 'デザインの更新に失敗しました' }, { status: 500 })
  }
}

// 名刺デザイン削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ designId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { designId } = await params

    // 使用中の注文があるか確認
    const ordersCount = await prisma.businessCardOrder.count({
      where: { designId },
    })

    if (ordersCount > 0) {
      return NextResponse.json(
        { success: false, error: 'このデザインは注文で使用されているため削除できません。無効化してください。' },
        { status: 400 }
      )
    }

    await prisma.businessCardDesign.delete({
      where: { id: designId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting business card design:', error)
    return NextResponse.json({ success: false, error: 'デザインの削除に失敗しました' }, { status: 500 })
  }
}
