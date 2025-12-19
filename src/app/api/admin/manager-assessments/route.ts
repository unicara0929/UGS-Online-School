import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'

/**
 * MGR査定結果一覧取得
 * GET /api/admin/manager-assessments
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const half = searchParams.get('half')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (year) {
      where.periodYear = parseInt(year)
    }
    if (half) {
      where.periodHalf = parseInt(half)
    }
    if (status) {
      where.status = status
    }

    const [assessments, total] = await Promise.all([
      prisma.managerAssessment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              memberId: true,
              name: true,
              email: true,
              role: true,
            }
          },
          previousRange: {
            select: {
              name: true,
              rangeNumber: true,
            }
          },
          newRange: {
            select: {
              name: true,
              rangeNumber: true,
            }
          }
        },
        orderBy: [
          { periodYear: 'desc' },
          { periodHalf: 'desc' },
          { user: { name: 'asc' } }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.managerAssessment.count({ where })
    ])

    // ステータス別件数
    const statusCounts = await prisma.managerAssessment.groupBy({
      by: ['status'],
      where: year && half ? { periodYear: parseInt(year), periodHalf: parseInt(half) } : undefined,
      _count: { id: true }
    })

    return NextResponse.json({
      success: true,
      assessments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts: Object.fromEntries(
        statusCounts.map(s => [s.status, s._count.id])
      )
    })
  } catch (error) {
    console.error('[MANAGER_ASSESSMENTS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '査定結果の取得に失敗しました' },
      { status: 500 }
    )
  }
}
