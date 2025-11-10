import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReferralStatus } from '@prisma/client'

/**
 * 紹介を承認
 * POST /api/referrals/[referralId]/approve
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
      where: { id: referralId },
      include: {
        referrer: {
          select: {
            id: true,
            role: true
          }
        },
        referred: {
          select: {
            id: true,
            role: true
          }
        }
      }
    })

    if (!referral) {
      return NextResponse.json(
        { error: '紹介が見つかりません' },
        { status: 404 }
      )
    }

    // 既に承認済みの場合はエラー
    if (referral.status === ReferralStatus.APPROVED) {
      return NextResponse.json(
        { error: 'この紹介は既に承認済みです' },
        { status: 400 }
      )
    }

    // 報酬金額を計算（承認時に設定）
    let rewardAmount = 0
    if (referral.referralType === 'MEMBER') {
      rewardAmount = 15000 // UGS会員紹介報酬
    } else if (referral.referralType === 'FP') {
      rewardAmount = 20000 // FPエイド紹介報酬
    }

    // 紹介を承認
    const updatedReferral = await prisma.referral.update({
      where: { id: referralId },
      data: {
        status: ReferralStatus.APPROVED,
        rewardAmount
      },
      include: {
        referred: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      referral: {
        id: updatedReferral.id,
        referrerId: updatedReferral.referrerId,
        referredId: updatedReferral.referredId,
        referralType: updatedReferral.referralType,
        status: updatedReferral.status,
        rewardAmount: updatedReferral.rewardAmount,
        createdAt: updatedReferral.createdAt,
        referred: updatedReferral.referred
      }
    })
  } catch (error) {
    console.error('Approve referral error:', error)
    return NextResponse.json(
      { error: '紹介の承認に失敗しました' },
      { status: 500 }
    )
  }
}

