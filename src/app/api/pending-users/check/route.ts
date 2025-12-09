import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PendingUserのメール認証状態をチェック
 * GET /api/pending-users/check?email=xxx
 *
 * セキュリティ対策：
 * - ユーザーが存在しない場合も同じレスポンス形式を返す（ユーザー列挙攻撃対策）
 * - 名前などの個人情報は返さない（情報漏洩対策）
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

    const pendingUser = await prisma.pendingUser.findUnique({
      where: { email },
      select: {
        emailVerified: true,
        tokenExpiresAt: true,
      }
    })

    // セキュリティ: ユーザーが存在しない場合も同じ形式で返す（列挙攻撃対策）
    if (!pendingUser) {
      return NextResponse.json({
        success: true,
        emailVerified: false,
        tokenExpired: false,
      })
    }

    return NextResponse.json({
      success: true,
      emailVerified: pendingUser.emailVerified,
      tokenExpired: pendingUser.tokenExpiresAt ? pendingUser.tokenExpiresAt < new Date() : false,
    })
  } catch (error) {
    console.error('Check pending user error:', error)
    return NextResponse.json(
      { error: 'Failed to check email verification status' },
      { status: 500 }
    )
  }
}
