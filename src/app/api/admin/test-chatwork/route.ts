import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'
import { sendCancellationChatworkNotification } from '@/lib/chatwork'

/**
 * Chatwork通知テスト用API（管理者専用）
 * POST /api/admin/test-chatwork
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN)
    if (roleError) return roleError

    const body = await request.json()
    const { userName, notificationType } = body

    if (!userName) {
      return NextResponse.json(
        { error: 'userName is required' },
        { status: 400 }
      )
    }

    // ユーザー情報を取得
    const user = await prisma.user.findFirst({
      where: {
        name: {
          contains: userName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: `ユーザー「${userName}」が見つかりません` },
        { status: 404 }
      )
    }

    // 通知タイプに応じて送信
    if (notificationType === 'cancellation' || !notificationType) {
      await sendCancellationChatworkNotification({
        userName: user.name,
        email: user.email,
        cancelledAt: new Date(),
      })
    }

    return NextResponse.json({
      success: true,
      message: `Chatwork通知を送信しました`,
      user: {
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('[TEST_CHATWORK_ERROR]', error)
    return NextResponse.json(
      { error: 'Chatwork通知の送信に失敗しました', details: String(error) },
      { status: 500 }
    )
  }
}
