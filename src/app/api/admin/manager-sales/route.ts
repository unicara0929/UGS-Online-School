import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'

/**
 * MGR売上データ一覧取得
 * GET /api/admin/manager-sales
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
    const month = searchParams.get('month')
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (month) {
      where.month = month
    }
    if (userId) {
      where.userId = userId
    }

    const [sales, total] = await Promise.all([
      prisma.managerMonthlySales.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              memberId: true,
              name: true,
              email: true,
              role: true,
              managerRangeId: true,
              managerRange: {
                select: {
                  name: true,
                  rangeNumber: true,
                }
              }
            }
          }
        },
        orderBy: [
          { month: 'desc' },
          { user: { name: 'asc' } }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.managerMonthlySales.count({ where })
    ])

    // 月別集計を取得
    const monthlyTotals = await prisma.managerMonthlySales.groupBy({
      by: ['month'],
      _sum: {
        salesAmount: true,
        insuredCount: true,
      },
      _count: {
        userId: true,
      },
      orderBy: {
        month: 'desc'
      },
      take: 12 // 直近12ヶ月分
    })

    return NextResponse.json({
      success: true,
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      monthlyTotals: monthlyTotals.map(m => ({
        month: m.month,
        totalSales: m._sum.salesAmount || 0,
        totalInsuredCount: m._sum.insuredCount || 0,
        userCount: m._count.userId,
      }))
    })
  } catch (error) {
    console.error('[MANAGER_SALES_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '売上データの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * MGR売上データのロック/ロック解除
 * PATCH /api/admin/manager-sales
 */
export async function PATCH(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const { ids, isLocked } = body as {
      ids: string[]
      isLocked: boolean
    }

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '対象データが選択されていません' },
        { status: 400 }
      )
    }

    await prisma.managerMonthlySales.updateMany({
      where: { id: { in: ids } },
      data: { isLocked }
    })

    return NextResponse.json({
      success: true,
      message: isLocked ? 'データをロックしました' : 'ロックを解除しました',
      count: ids.length
    })
  } catch (error) {
    console.error('[MANAGER_SALES_PATCH_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'ロック処理に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * MGR売上データの削除
 * DELETE /api/admin/manager-sales
 */
export async function DELETE(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '対象データが選択されていません' },
        { status: 400 }
      )
    }

    // ロック済みのデータは削除不可
    const lockedCount = await prisma.managerMonthlySales.count({
      where: {
        id: { in: ids },
        isLocked: true
      }
    })

    if (lockedCount > 0) {
      return NextResponse.json(
        { success: false, error: `${lockedCount}件のロック済みデータが含まれています。ロックを解除してから削除してください。` },
        { status: 400 }
      )
    }

    await prisma.managerMonthlySales.deleteMany({
      where: { id: { in: ids } }
    })

    return NextResponse.json({
      success: true,
      message: 'データを削除しました',
      count: ids.length
    })
  } catch (error) {
    console.error('[MANAGER_SALES_DELETE_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '削除処理に失敗しました' },
      { status: 500 }
    )
  }
}
