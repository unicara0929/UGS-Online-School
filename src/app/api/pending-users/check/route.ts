import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PendingUserのメール認証状態をチェック
 * GET /api/pending-users/check?email=xxx
 *
 * 認証済みユーザーが決済に進む際に必要な情報を返す
 *
 * セキュリティ:
 * - 認証済み仮登録ユーザーには名前を返す（決済導線に必要）
 * - 未認証ユーザーには名前を返さない（メール認証完了まで本人確認ができないため）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    // まずPendingUserを確認
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { email },
      select: {
        name: true,
        emailVerified: true,
        tokenExpiresAt: true,
      }
    })

    // PendingUserが存在しない場合、本登録済みユーザーを確認
    if (!pendingUser) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      })

      if (existingUser) {
        // 本登録済みの場合
        return NextResponse.json({
          success: true,
          exists: true,
          isFullyRegistered: true,
          emailVerified: true,
          tokenExpired: false,
        })
      }

      // どちらにも存在しない場合
      return NextResponse.json({
        success: true,
        exists: false,
        emailVerified: false,
        tokenExpired: false,
      })
    }

    // PendingUserが存在する場合（仮登録済み）
    // セキュリティ: 認証済みユーザーにのみ名前を返す（決済導線に必要）
    return NextResponse.json({
      success: true,
      exists: true,
      isFullyRegistered: false,
      emailVerified: pendingUser.emailVerified,
      tokenExpired: pendingUser.tokenExpiresAt ? pendingUser.tokenExpiresAt < new Date() : false,
      // 認証済みユーザーにのみ名前を返す
      name: pendingUser.emailVerified ? pendingUser.name : undefined,
    })
  } catch (error) {
    console.error('Check pending user error:', error)
    return NextResponse.json(
      { error: 'Failed to check email verification status' },
      { status: 500 }
    )
  }
}
