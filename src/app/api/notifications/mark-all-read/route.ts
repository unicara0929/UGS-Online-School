import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * すべての通知を既読にする
 * POST /api/notifications/mark-all-read
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      )
    }

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

