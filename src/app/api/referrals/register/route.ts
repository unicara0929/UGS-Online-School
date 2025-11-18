import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReferralStatus } from '@prisma/client'
import { Roles } from '@/lib/auth/api-helpers'

/**
 * 紹介コードで紹介を登録
 * POST /api/referrals/register
 */
export async function POST(request: NextRequest) {
  try {
    const { referralCode, referredUserId } = await request.json()

    if (!referralCode || !referredUserId) {
      return NextResponse.json(
        { error: '紹介コードと被紹介者IDが必要です' },
        { status: 400 }
      )
    }

    // 紹介コードから紹介者を取得
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: {
        id: true,
        role: true
      }
    })

    if (!referrer) {
      return NextResponse.json(
        { error: '無効な紹介コードです' },
        { status: 404 }
      )
    }

    // 自己紹介を防ぐ
    if (referrer.id === referredUserId) {
      return NextResponse.json(
        { error: '自分自身を紹介することはできません' },
        { status: 400 }
      )
    }

    // 被紹介者のロールを確認
    const referredUser = await prisma.user.findUnique({
      where: { id: referredUserId },
      select: { role: true }
    })

    if (!referredUser) {
      return NextResponse.json(
        { error: '被紹介者が見つかりません' },
        { status: 404 }
      )
    }

    // 紹介タイプを決定（被紹介者のロールに基づく）
    const referralType = referredUser.role === Roles.FP ? 'FP' : 'MEMBER'

    // 既存の紹介をチェック
    const existingReferral = await prisma.referral.findUnique({
      where: {
        referrerId_referredId: {
          referrerId: referrer.id,
          referredId: referredUserId
        }
      }
    })

    if (existingReferral) {
      return NextResponse.json(
        { error: 'この紹介は既に登録されています' },
        { status: 409 }
      )
    }

    // 紹介を登録
    const referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: referredUserId,
        referralType: referralType as any,
        status: ReferralStatus.PENDING
      },
      include: {
        referrer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
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
        id: referral.id,
        referrerId: referral.referrerId,
        referredId: referral.referredId,
        referralType: referral.referralType,
        status: referral.status,
        createdAt: referral.createdAt,
        referrer: referral.referrer,
        referred: referral.referred
      }
    })
  } catch (error: any) {
    console.error('Register referral error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'この紹介は既に登録されています' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: '紹介の登録に失敗しました' },
      { status: 500 }
    )
  }
}

