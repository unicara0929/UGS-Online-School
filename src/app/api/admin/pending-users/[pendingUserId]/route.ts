import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'
import crypto from 'crypto'
import { sendEmailVerification } from '@/lib/services/email-service'

/**
 * 仮登録ユーザーの詳細取得
 * GET /api/admin/pending-users/[pendingUserId]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ pendingUserId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック（MANAGER以上）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.MANAGER_AND_ABOVE)
    if (roleError) return roleError

    const { pendingUserId } = await context.params

    const pendingUser = await prisma.pendingUser.findUnique({
      where: { id: pendingUserId }
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: '仮登録ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      pendingUser: {
        id: pendingUser.id,
        email: pendingUser.email,
        name: pendingUser.name,
        emailVerified: pendingUser.emailVerified,
        referralCode: pendingUser.referralCode,
        tokenExpiresAt: pendingUser.tokenExpiresAt,
        createdAt: pendingUser.createdAt,
        updatedAt: pendingUser.updatedAt,
      }
    })
  } catch (error) {
    console.error('PendingUser detail API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * 仮登録ユーザーの更新（メール認証ステータス変更など）
 * PATCH /api/admin/pending-users/[pendingUserId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ pendingUserId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック（MANAGER以上）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.MANAGER_AND_ABOVE)
    if (roleError) return roleError

    const { pendingUserId } = await context.params
    const body = await request.json()
    const { action, emailVerified } = body

    const pendingUser = await prisma.pendingUser.findUnique({
      where: { id: pendingUserId }
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: '仮登録ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // アクションに応じた処理
    if (action === 'verify') {
      // 手動でメール認証済みにする
      const updated = await prisma.pendingUser.update({
        where: { id: pendingUserId },
        data: { emailVerified: true }
      })

      return NextResponse.json({
        success: true,
        message: 'メール認証ステータスを更新しました',
        pendingUser: updated
      })
    }

    if (action === 'resend') {
      // 認証メールを再送信
      const verificationToken = crypto.randomBytes(32).toString('hex')
      const tokenExpiresAt = new Date()
      tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24)

      await prisma.pendingUser.update({
        where: { id: pendingUserId },
        data: {
          verificationToken,
          tokenExpiresAt,
        }
      })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const verificationLink = `${appUrl}/api/verify-email?token=${verificationToken}`

      try {
        await sendEmailVerification({
          to: pendingUser.email,
          userName: pendingUser.name,
          verificationLink,
        })

        return NextResponse.json({
          success: true,
          message: '認証メールを再送信しました'
        })
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError)
        return NextResponse.json(
          { error: '認証メールの送信に失敗しました' },
          { status: 500 }
        )
      }
    }

    // emailVerifiedの直接更新
    if (typeof emailVerified === 'boolean') {
      const updated = await prisma.pendingUser.update({
        where: { id: pendingUserId },
        data: { emailVerified }
      })

      return NextResponse.json({
        success: true,
        pendingUser: updated
      })
    }

    return NextResponse.json(
      { error: '無効なリクエストです' },
      { status: 400 }
    )
  } catch (error) {
    console.error('PendingUser update API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * 仮登録ユーザーの削除
 * DELETE /api/admin/pending-users/[pendingUserId]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ pendingUserId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック（MANAGER以上）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.MANAGER_AND_ABOVE)
    if (roleError) return roleError

    const { pendingUserId } = await context.params

    const pendingUser = await prisma.pendingUser.findUnique({
      where: { id: pendingUserId }
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: '仮登録ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    await prisma.pendingUser.delete({
      where: { id: pendingUserId }
    })

    return NextResponse.json({
      success: true,
      message: '仮登録ユーザーを削除しました'
    })
  } catch (error) {
    console.error('PendingUser delete API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
