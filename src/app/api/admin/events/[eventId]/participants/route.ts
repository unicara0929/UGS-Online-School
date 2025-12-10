import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * イベント参加者一覧取得API
 * 管理者がイベントの参加者リストを取得
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { eventId } = await context.params
    const { searchParams } = new URL(request.url)

    // フィルターパラメータ
    const paymentStatus = searchParams.get('status') // PAID, PENDING, FREE, etc.
    const role = searchParams.get('role') // MEMBER, FP, MANAGER
    const search = searchParams.get('search') // 名前・メールで検索

    // イベント情報を取得
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 参加者一覧を取得（フィルター適用）
    const whereClause: any = {
      eventId: eventId,
    }

    // 支払いステータスフィルター
    if (paymentStatus && paymentStatus !== 'all') {
      whereClause.paymentStatus = paymentStatus
    }

    // ユーザーのロールと検索条件
    const userWhereClause: any = {}
    if (role && role !== 'all') {
      userWhereClause.role = role.toUpperCase()
    }
    if (search) {
      userWhereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: {
        ...whereClause,
        ...(Object.keys(userWhereClause).length > 0 ? { user: userWhereClause } : {}),
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

    // レスポンス用にフォーマット
    const participants = registrations.map((reg) => ({
      id: reg.id,
      userId: reg.user.id,
      userName: reg.user.name,
      userEmail: reg.user.email,
      userRole: reg.user.role,
      paymentStatus: reg.paymentStatus,
      paidAmount: reg.paidAmount,
      registeredAt: reg.createdAt.toISOString(),
      paidAt: reg.paidAt?.toISOString() || null,
      canceledAt: reg.canceledAt?.toISOString() || null,
      cancelReason: reg.cancelReason || null,
    }))

    // サマリー情報を計算
    const summary = {
      totalCount: registrations.length,
      paidCount: registrations.filter((r) => r.paymentStatus === 'PAID').length,
      pendingCount: registrations.filter((r) => r.paymentStatus === 'PENDING').length,
      freeCount: registrations.filter((r) => r.paymentStatus === 'FREE').length,
      refundedCount: registrations.filter((r) => r.paymentStatus === 'REFUNDED').length,
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        date: event.date.toISOString(),
        time: event.time || '',
        isPaid: event.isPaid,
        price: event.price,
        isRecurring: event.isRecurring || false,
      },
      summary,
      participants,
    })
  } catch (error) {
    console.error('Get event participants error:', error)
    return NextResponse.json(
      { error: '参加者一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
