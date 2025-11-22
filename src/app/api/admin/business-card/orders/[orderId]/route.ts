import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// 名刺注文詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { orderId } = await params

    const order = await prisma.businessCardOrder.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
        design: {
          select: { id: true, name: true, description: true, previewUrl: true },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ success: false, error: '注文が見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Error fetching business card order:', error)
    return NextResponse.json({ success: false, error: '注文の取得に失敗しました' }, { status: 500 })
  }
}

// 名刺注文更新（ステータス変更、メモ追加）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { orderId } = await params
    const body = await request.json()
    const { status, adminNotes } = body

    const updateData: any = {}

    if (status) {
      updateData.status = status
      // ステータスに応じて日時を記録
      switch (status) {
        case 'ORDERED':
          updateData.processedBy = user!.id
          updateData.processedAt = new Date()
          break
        case 'SHIPPED':
          updateData.shippedAt = new Date()
          break
        case 'COMPLETED':
          updateData.completedAt = new Date()
          break
      }
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes
    }

    const order = await prisma.businessCardOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        design: {
          select: { id: true, name: true, previewUrl: true },
        },
      },
    })

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Error updating business card order:', error)
    return NextResponse.json({ success: false, error: '注文の更新に失敗しました' }, { status: 500 })
  }
}
