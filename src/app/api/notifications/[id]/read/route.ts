import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 通知既読マークAPI
 * POST /api/notifications/[id]/read
 *
 * 指定した通知を既読にする
 * - Notification テーブル（個別通知）と SystemNotification テーブル（システム通知）の両方に対応
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { id: notificationId } = await params

    // まず個別通知（Notification）テーブルを確認
    const personalNotification = await prisma.notification.findUnique({
      where: { id: notificationId }
    })

    if (personalNotification) {
      // 所有権チェック: 自分の通知のみ既読にできる
      if (personalNotification.userId !== authUser!.id) {
        return NextResponse.json(
          { error: 'アクセス権限がありません。自分の通知のみ既読にできます。' },
          { status: 403 }
        )
      }

      // 個別通知を既読にする
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
    }

    // 個別通知が見つからない場合は、システム通知を確認
    const systemNotification = await prisma.systemNotification.findUnique({
      where: { id: notificationId }
    })

    if (!systemNotification) {
      return NextResponse.json(
        { success: false, error: '通知が見つかりません' },
        { status: 404 }
      )
    }

    // システム通知の既読レコードを作成（既に存在する場合はスキップ）
    await prisma.userNotificationRead.upsert({
      where: {
        userId_notificationId: {
          userId: authUser!.id,
          notificationId: notificationId
        }
      },
      update: {},
      create: {
        userId: authUser!.id,
        notificationId: notificationId
      }
    })

    return NextResponse.json({
      success: true,
      message: '通知を既読にしました'
    })
  } catch (error: any) {
    console.error('Error marking notification as read:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '通知が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: '既読処理に失敗しました' },
      { status: 500 }
    )
  }
}
