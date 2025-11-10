import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReferralStatus } from '@prisma/client'

/**
 * 紹介を却下
 * POST /api/referrals/[referralId]/reject
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ referralId: string }> }
) {
  try {
    const { referralId } = await context.params

    if (!referralId) {
      return NextResponse.json(
        { error: '紹介IDが必要です' },
        { status: 400 }
      )
    }

    // 紹介を取得
    const referral = await prisma.referral.findUnique({
      where: { id: referralId }
    })

    if (!referral) {
      return NextResponse.json(
        { error: '紹介が見つかりません' },
        { status: 404 }
      )
    }

    // 紹介を却下
    const updatedReferral = await prisma.referral.update({
      where: { id: referralId },
      data: {
        status: ReferralStatus.REJECTED
      }
    })

    return NextResponse.json({
      success: true,
      referral: {
        id: updatedReferral.id,
        status: updatedReferral.status
      }
    })
  } catch (error) {
    console.error('Reject referral error:', error)
    return NextResponse.json(
      { error: '紹介の却下に失敗しました' },
      { status: 500 }
    )
  }
}

