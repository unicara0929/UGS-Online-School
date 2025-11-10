import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 通知を既読にする
 * POST /api/notifications/[notificationId]/read
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ notificationId: string }> }
) {
  try {
    const { notificationId } = await context.params

    if (!notificationId) {
      return NextResponse.json(
        { error: '通知IDが必要です' },
        { status: 400 }
      )
    }

    // 通知を既読にする
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        isRead: notification.isRead,
        readAt: notification.readAt
      }
    })
  } catch (error: any) {
    console.error('Mark notification as read error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '通知が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '通知の既読マークに失敗しました' },
      { status: 500 }
    )
  }
}

