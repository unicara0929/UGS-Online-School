import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * すべての通知を既読にする
 * POST /api/notifications/mark-all-read
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // リクエストボディのuserIdを使わず、認証ユーザーのIDを使用
    const userId = authUser!.id

    // すべての未読通知を既読にする
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      updatedCount: result.count
    })
  } catch (error) {
    console.error('Mark all notifications as read error:', error)
    return NextResponse.json(
      { error: '通知の一括既読に失敗しました' },
      { status: 500 }
    )
  }
}

