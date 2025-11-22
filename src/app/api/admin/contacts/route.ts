import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// お問い合わせ一覧取得（管理者用）
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const submissions = await prisma.contactSubmission.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(type && { type: type as any }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // ステータス別のカウントを取得
    const statusCounts = await prisma.contactSubmission.groupBy({
      by: ['status'],
      _count: true,
    })

    const counts = {
      total: submissions.length,
      pending: statusCounts.find(s => s.status === 'PENDING')?._count || 0,
      inProgress: statusCounts.find(s => s.status === 'IN_PROGRESS')?._count || 0,
      resolved: statusCounts.find(s => s.status === 'RESOLVED')?._count || 0,
      closed: statusCounts.find(s => s.status === 'CLOSED')?._count || 0,
    }

    return NextResponse.json({ success: true, submissions, counts })
  } catch (error) {
    console.error('Error fetching contact submissions:', error)
    return NextResponse.json({ success: false, error: 'お問い合わせの取得に失敗しました' }, { status: 500 })
  }
}
