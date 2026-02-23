import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    // URLパラメータから月でフィルタリングできるようにする
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM形式
    const status = searchParams.get('status') // PENDING, CONFIRMED, PAID

    // 全ユーザーの報酬を取得
    const compensations = await prisma.compensation.findMany({
      where: {
        ...(month && { month }),
        ...(status && { status: status as any }),
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
        details: true,
      },
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    })

    // 統計情報を計算
    const totalAmount = compensations.reduce((sum, c) => sum + c.amount, 0)
    const pendingAmount = compensations
      .filter((c) => c.status === 'PENDING')
      .reduce((sum, c) => sum + c.amount, 0)
    const confirmedAmount = compensations
      .filter((c) => c.status === 'CONFIRMED')
      .reduce((sum, c) => sum + c.amount, 0)
    const paidAmount = compensations
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + c.amount, 0)

    return NextResponse.json({
      success: true,
      compensations,
      stats: {
        total: totalAmount,
        pending: pendingAmount,
        confirmed: confirmedAmount,
        paid: paidAmount,
        count: {
          total: compensations.length,
          pending: compensations.filter((c) => c.status === 'PENDING').length,
          confirmed: compensations.filter((c) => c.status === 'CONFIRMED').length,
          paid: compensations.filter((c) => c.status === 'PAID').length,
        },
      },
    })
  } catch (error) {
    console.error('[ADMIN_COMPENSATIONS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '報酬情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
