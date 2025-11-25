import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 通知既読マークAPI
 * POST /api/notifications/[id]/read
 *
 * 指定した通知を既読にする
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

    // 通知が存在するか確認
    const notification = await prisma.systemNotification.findUnique({
      where: { id: notificationId }
    })

    if (!notification) {
      return NextResponse.json(
        { success: false, error: '通知が見つかりません' },
        { status: 404 }
      )
    }

    // 既読レコードを作成（既に存在する場合はスキップ）
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
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { success: false, error: '既読処理に失敗しました' },
      { status: 500 }
    )
  }
}
