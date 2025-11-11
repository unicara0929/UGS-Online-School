import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 通知一覧を取得
 * GET /api/notifications
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const isRead = searchParams.get('isRead') === 'true' ? true : searchParams.get('isRead') === 'false' ? false : undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // クエリパラメータのuserIdを使わず、認証ユーザーのIDを使用
    const userId = authUser!.id

    const where: any = {
      userId
    }

    if (isRead !== undefined) {
      where.isRead = isRead
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.notification.count({ where })
    ])

    // 未読数を取得
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    })

    return NextResponse.json({
      success: true,
      notifications: notifications.map(notif => ({
        id: notif.id,
        userId: notif.userId,
        type: notif.type,
        priority: notif.priority,
        title: notif.title,
        message: notif.message,
        actionUrl: notif.actionUrl,
        isRead: notif.isRead,
        readAt: notif.readAt,
        createdAt: notif.createdAt
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      unreadCount
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: '通知一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

