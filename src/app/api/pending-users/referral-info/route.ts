import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PendingUserの紹介情報を取得
 * GET /api/pending-users/referral-info?email=xxx
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

    // PendingUserから紹介コードを取得
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { email },
      select: {
        referralCode: true,
      }
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: 'Pending user not found' },
        { status: 404 }
      )
    }

    // 紹介コードがない場合
    if (!pendingUser.referralCode) {
      return NextResponse.json({
        success: true,
        hasReferral: false,
        referralCode: null,
        referrer: null
      })
    }

    // 紹介者の情報を取得
    const referrer = await prisma.user.findUnique({
      where: { referralCode: pendingUser.referralCode },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    if (!referrer) {
      // 紹介コードは存在するが、紹介者が見つからない場合
      return NextResponse.json({
        success: true,
        hasReferral: true,
        referralCode: pendingUser.referralCode,
        referrer: null,
        warning: 'Referrer not found for this code'
      })
    }

    return NextResponse.json({
      success: true,
      hasReferral: true,
      referralCode: pendingUser.referralCode,
      referrer: {
        id: referrer.id,
        name: referrer.name,
        role: referrer.role,
      }
    })
  } catch (error) {
    console.error('Get referral info error:', error)
    return NextResponse.json(
      { error: 'Failed to get referral information' },
      { status: 500 }
    )
  }
}
