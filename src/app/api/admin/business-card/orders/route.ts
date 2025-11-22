import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// 名刺注文一覧取得（管理者用）
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status) {
      where.status = status
    }

    const orders = await prisma.businessCardOrder.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        design: {
          select: { id: true, name: true, previewUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ステータス別カウント
    const counts = await prisma.businessCardOrder.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const statusCounts = {
      total: orders.length,
      pending: 0,
      paid: 0,
      ordered: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
    }

    counts.forEach((c) => {
      switch (c.status) {
        case 'PENDING':
          statusCounts.pending = c._count.id
          break
        case 'PAID':
          statusCounts.paid = c._count.id
          break
        case 'ORDERED':
          statusCounts.ordered = c._count.id
          break
        case 'SHIPPED':
          statusCounts.shipped = c._count.id
          break
        case 'COMPLETED':
          statusCounts.completed = c._count.id
          break
        case 'CANCELLED':
          statusCounts.cancelled = c._count.id
          break
      }
    })

    statusCounts.total = statusCounts.pending + statusCounts.paid + statusCounts.ordered + statusCounts.shipped + statusCounts.completed + statusCounts.cancelled

    return NextResponse.json({ success: true, orders, counts: statusCounts })
  } catch (error) {
    console.error('Error fetching business card orders:', error)
    return NextResponse.json(
      { success: false, error: '名刺注文一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
