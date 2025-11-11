import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReferralStatus } from '@prisma/client'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 紹介を承認
 * POST /api/referrals/[referralId]/approve
 * 権限: 管理者のみ
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ referralId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) {
      return adminError || NextResponse.json(
        { error: 'アクセス権限がありません。管理者権限が必要です。' },
        { status: 403 }
      )
    }

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

    // 紹介を承認（報酬は設定しない）
    const updatedReferral = await prisma.referral.update({
      where: { id: referralId },
      data: {
        status: ReferralStatus.APPROVED,
        rewardAmount: null // 報酬は設定しない
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

