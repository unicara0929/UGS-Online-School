import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PendingUserのメール認証状態をチェック
 * GET /api/pending-users/check?email=xxx
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

    if (!pendingUser) {
      return NextResponse.json(
        { error: 'Pending user not found', emailVerified: false },
        { status: 404 }
      )
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
