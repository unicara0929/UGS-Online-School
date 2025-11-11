import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 通知を既読にする
 * POST /api/notifications/[notificationId]/read
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ notificationId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { notificationId } = await context.params

    if (!notificationId) {
      return NextResponse.json(
        { error: '通知IDが必要です' },
        { status: 400 }
      )
    }

    // 通知の所有権チェック
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    })

    if (!notification) {
      return NextResponse.json({ error: '通知が見つかりません' }, { status: 404 })
    }

    // 所有権チェック: 自分の通知のみ既読にできる
    if (notification.userId !== authUser!.id) {
      return NextResponse.json(
        { error: 'アクセス権限がありません。自分の通知のみ既読にできます。' },
        { status: 403 }
      )
    }

    // 通知を既読にする
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      notification: {
        id: updatedNotification.id,
        isRead: updatedNotification.isRead,
        readAt: updatedNotification.readAt
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

