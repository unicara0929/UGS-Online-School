import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 全体MTG免除申請管理API（管理者用）
 *
 * GET: 申請一覧を取得
 */

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const eventId = searchParams.get('eventId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // フィルター条件を構築
    const where: Record<string, unknown> = {}

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (eventId) {
      where.eventId = eventId
    }

    // 総数を取得
    const total = await prisma.mtgExemption.count({ where })

    // 申請一覧を取得
    const exemptions = await prisma.mtgExemption.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberId: true,
            role: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING を先に
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    })

    // ステータス別の件数を取得
    const statusCounts = await prisma.mtgExemption.groupBy({
      by: ['status'],
      _count: true,
    })

    const counts = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    }

    statusCounts.forEach((item) => {
      counts[item.status as keyof typeof counts] = item._count
    })

    return NextResponse.json({
      success: true,
      exemptions: exemptions.map((e) => ({
        id: e.id,
        status: e.status,
        reason: e.reason,
        adminNotes: e.adminNotes,
        reviewedAt: e.reviewedAt?.toISOString() ?? null,
        reviewedBy: e.reviewedBy,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        user: {
          id: e.user.id,
          name: e.user.name,
          email: e.user.email,
          memberId: e.user.memberId,
          role: e.user.role,
        },
        event: {
          id: e.event.id,
          title: e.event.title,
          date: e.event.date.toISOString(),
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts,
    })
  } catch (error) {
    console.error('[GET_ADMIN_EXEMPTIONS_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '免除申請一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
