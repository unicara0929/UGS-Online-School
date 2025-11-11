import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReferralStatus } from '@prisma/client'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 紹介を却下
 * POST /api/referrals/[referralId]/reject
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

