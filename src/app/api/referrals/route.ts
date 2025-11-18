import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReferralType, ReferralStatus } from '@prisma/client'
import { getAuthenticatedUser, checkRole, RoleGroups, checkFPOnboarding, Roles } from '@/lib/auth/api-helpers'

/**
 * 紹介一覧を取得
 * GET /api/referrals
 * 権限: FP以上、自分のデータのみ
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // FP以上のロールチェック
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.FP_AND_ABOVE)
    if (roleError) return roleError

    // FPエイドの場合はオンボーディング完了チェック
    const { completed, error: onboardingError } = await checkFPOnboarding(authUser!.id, authUser!.role)
    if (!completed) return onboardingError!

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as ReferralType | null // 'MEMBER' | 'FP'

    // 認証ユーザーのデータのみを取得（クエリパラメータのuserIdは使用しない）
    const where: any = {
      referrerId: authUser!.id
    }

    if (type) {
      where.referralType = type
    }

    const referrals = await prisma.referral.findMany({
      where,
      include: {
        referred: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      referrals: referrals.map(ref => ({
        id: ref.id,
        referrerId: ref.referrerId,
        referredId: ref.referredId,
        referralType: ref.referralType,
        status: ref.status,
        rewardAmount: ref.rewardAmount,
        rewardPaidAt: ref.rewardPaidAt,
        createdAt: ref.createdAt,
        referred: ref.referred
      }))
    })
  } catch (error) {
    console.error('Get referrals error:', error)
    return NextResponse.json(
      { error: '紹介一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 紹介を登録
 * POST /api/referrals
 * 権限: FP以上
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // FP以上のロールチェック
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.FP_AND_ABOVE)
    if (roleError) return roleError

    // FPエイドの場合はオンボーディング完了チェック
    const { completed, error: onboardingError } = await checkFPOnboarding(authUser!.id, authUser!.role)
    if (!completed) return onboardingError!

    const { referredId, referralType } = await request.json()

    if (!referredId || !referralType) {
      return NextResponse.json(
        { error: '被紹介者ID、紹介タイプが必要です' },
        { status: 400 }
      )
    }

    // 紹介タイプの検証
    if (!['MEMBER', 'FP'].includes(referralType)) {
      return NextResponse.json(
        { error: '無効な紹介タイプです' },
        { status: 400 }
      )
    }

    // 自己紹介を防ぐ
    if (authUser!.id === referredId) {
      return NextResponse.json(
        { error: '自分自身を紹介することはできません' },
        { status: 400 }
      )
    }

    // 既存の紹介をチェック
    const existingReferral = await prisma.referral.findUnique({
      where: {
        referrerId_referredId: {
          referrerId: authUser!.id,
          referredId
        }
      }
    })

    if (existingReferral) {
      return NextResponse.json(
        { error: 'この紹介は既に登録されています' },
        { status: 409 }
      )
    }

    // 被紹介者のロールを確認
    const referredUser = await prisma.user.findUnique({
      where: { id: referredId },
      select: { role: true }
    })

    if (!referredUser) {
      return NextResponse.json(
        { error: '被紹介者が見つかりません' },
        { status: 404 }
      )
    }

    // 紹介タイプとユーザーロールの整合性をチェック
    if (referralType === 'MEMBER' && referredUser.role !== Roles.MEMBER) {
      return NextResponse.json(
        { error: 'UGS会員紹介は、UGS会員のみが対象です' },
        { status: 400 }
      )
    }

    if (referralType === 'FP' && referredUser.role !== Roles.FP) {
      return NextResponse.json(
        { error: 'FPエイド紹介は、FPエイドのみが対象です' },
        { status: 400 }
      )
    }

    // 紹介を登録（認証ユーザーのIDを使用）
    const referral = await prisma.referral.create({
      data: {
        referrerId: authUser!.id,
        referredId,
        referralType: referralType as ReferralType,
        status: ReferralStatus.PENDING
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
        id: referral.id,
        referrerId: referral.referrerId,
        referredId: referral.referredId,
        referralType: referral.referralType,
        status: referral.status,
        createdAt: referral.createdAt,
        referred: referral.referred
      }
    })
  } catch (error: any) {
    console.error('Create referral error:', error)

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

