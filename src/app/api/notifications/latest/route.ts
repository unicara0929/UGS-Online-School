import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 最新の未読通知取得API
 * GET /api/notifications/latest
 *
 * ログインユーザーの未読通知のうち、最新1件を取得
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // ユーザーのロールを取得
    const userRole = authUser!.role as 'ADMIN' | 'MANAGER' | 'FP' | 'MEMBER'

    // ユーザーの既読通知IDリストを取得
    const readNotifications = await prisma.userNotificationRead.findMany({
      where: { userId: authUser!.id },
      select: { notificationId: true }
    })

    const readNotificationIds = readNotifications.map(r => r.notificationId)

    console.log('[NOTIFICATION_FETCH_DEBUG]', {
      userId: authUser!.id,
      userRole,
      readNotificationCount: readNotificationIds.length
    })

    // 未読の通知を取得（最新1件）
    // 対象ロールが指定されている場合は、ユーザーのロールが含まれているものだけ
    // 対象ロールが空の場合は全員向け
    const latestNotification = await prisma.systemNotification.findFirst({
      where: {
        isActive: true,
        id: {
          notIn: readNotificationIds.length > 0 ? readNotificationIds : undefined
        },
        OR: [
          { targetRoles: { isEmpty: true } }, // 全員向け
          { targetRoles: { has: userRole as any } }  // 特定ロール向け
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (latestNotification) {
      console.log('[NOTIFICATION_FOUND_DEBUG]', {
        notificationId: latestNotification.id,
        title: latestNotification.title,
        targetRoles: latestNotification.targetRoles,
        userRole
      })
    }

    if (!latestNotification) {
      return NextResponse.json({
        success: true,
        notification: null
      })
    }

    return NextResponse.json({
      success: true,
      notification: {
        id: latestNotification.id,
        type: latestNotification.type,
        title: latestNotification.title,
        targetUrl: latestNotification.targetUrl,
        contentType: latestNotification.contentType,
        contentId: latestNotification.contentId,
        createdAt: latestNotification.createdAt
      }
    })
  } catch (error) {
    console.error('Error fetching latest notification:', error)
    return NextResponse.json(
      { success: false, error: '通知の取得に失敗しました' },
      { status: 500 }
    )
  }
}
