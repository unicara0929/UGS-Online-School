import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * メール送信履歴一覧取得API
 * GET /api/admin/email-history
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

    // フィルターパラメータ
    const sourceType = searchParams.get('sourceType') // USER_MANAGEMENT | EVENT_MANAGEMENT
    const eventId = searchParams.get('eventId')
    const keyword = searchParams.get('keyword') // 件名検索
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // フィルター条件を構築
    const where: any = {}

    if (sourceType) {
      where.sourceType = sourceType
    }

    if (eventId) {
      where.eventId = eventId
    }

    if (keyword) {
      where.OR = [
        { subject: { contains: keyword, mode: 'insensitive' } },
        { body: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    if (startDate || endDate) {
      where.sentAt = {}
      if (startDate) {
        where.sentAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.sentAt.lte = new Date(endDate)
      }
    }

    // ページネーション
    const skip = (page - 1) * limit

    // 総数を取得
    const total = await prisma.emailCampaign.count({ where })

    // データを取得
    const campaigns = await prisma.emailCampaign.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            logs: true,
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
      skip,
      take: limit,
    })

    return NextResponse.json({
      success: true,
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get email history error:', error)
    return NextResponse.json(
      { error: 'メール送信履歴の取得に失敗しました' },
      { status: 500 }
    )
  }
}
