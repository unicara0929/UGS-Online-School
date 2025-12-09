import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PendingUserの紹介情報を取得
 * GET /api/pending-users/referral-info?email=xxx
 *
 * セキュリティ対策：
 * - ユーザーが存在しない場合も同じレスポンス形式を返す（ユーザー列挙攻撃対策）
 * - 紹介者のIDやメールアドレスは返さない（情報漏洩対策）
 * - 紹介者の名前のみ表示用に返す
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

    // セキュリティ: ユーザーが存在しない場合も同じ形式で返す（列挙攻撃対策）
    if (!pendingUser) {
      return NextResponse.json({
        success: true,
        hasReferral: false,
        referralCode: null,
        referrer: null
      })
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

    // 紹介者の情報を取得（名前のみ）
    const referrer = await prisma.user.findUnique({
      where: { referralCode: pendingUser.referralCode },
      select: {
        name: true,
      }
    })

    if (!referrer) {
      // 紹介コードは存在するが、紹介者が見つからない場合
      return NextResponse.json({
        success: true,
        hasReferral: true,
        referralCode: pendingUser.referralCode,
        referrer: null
      })
    }

    // セキュリティ: 紹介者の名前のみ返す（IDやロールは不要）
    return NextResponse.json({
      success: true,
      hasReferral: true,
      referralCode: pendingUser.referralCode,
      referrer: {
        name: referrer.name,
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
