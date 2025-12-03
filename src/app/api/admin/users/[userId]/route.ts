import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'
import { ReferralType, ReferralStatus } from '@prisma/client'

/**
 * ユーザー詳細取得 API
 * 管理者が特定ユーザーの詳細情報を取得
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック（MANAGER以上）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.MANAGER_AND_ABOVE)
    if (roleError) return roleError

    const { userId } = await context.params

    // Prismaからユーザー詳細を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        referralsAsReferred: {
          include: {
            referrer: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          take: 1
        },
        fpPromotionApplications: {
          orderBy: {
            appliedAt: 'desc'
          },
          take: 1
        },
        compensationBankAccount: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // Supabaseから認証情報を取得
    let supabaseUser = null
    try {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (!error && data.user) {
        supabaseUser = data.user
      }
    } catch (err) {
      console.error('Supabase user fetch error:', err)
      // Supabaseエラーは無視して続行
    }

    // 紹介者として行った紹介のタイプ別統計を取得
    const [memberReferralsTotal, fpReferralsTotal, memberReferralsApproved, fpReferralsApproved] = await Promise.all([
      prisma.referral.count({
        where: { referrerId: userId, referralType: ReferralType.MEMBER }
      }),
      prisma.referral.count({
        where: { referrerId: userId, referralType: ReferralType.FP }
      }),
      prisma.referral.count({
        where: {
          referrerId: userId,
          referralType: ReferralType.MEMBER,
          status: { in: [ReferralStatus.APPROVED, ReferralStatus.REWARDED] }
        }
      }),
      prisma.referral.count({
        where: {
          referrerId: userId,
          referralType: ReferralType.FP,
          status: { in: [ReferralStatus.APPROVED, ReferralStatus.REWARDED] }
        }
      })
    ])

    const referralStats = {
      total: memberReferralsTotal + fpReferralsTotal,
      totalApproved: memberReferralsApproved + fpReferralsApproved,
      member: {
        total: memberReferralsTotal,
        approved: memberReferralsApproved
      },
      fp: {
        total: fpReferralsTotal,
        approved: fpReferralsApproved
      }
    }

    // レスポンス用にデータを整形
    const userDetail = {
      // 基本情報
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,

      // プロフィール情報
      phone: user.phone,
      lineId: user.lineId,
      address: user.address,
      bio: user.bio,
      attribute: user.attribute,
      gender: user.gender,
      birthDate: user.birthDate,
      prefecture: user.prefecture,
      profileImageUrl: user.profileImageUrl,

      // 会員管理情報
      membershipStatus: user.membershipStatus,
      membershipStatusReason: user.membershipStatusReason,
      membershipStatusChangedAt: user.membershipStatusChangedAt,
      membershipStatusChangedBy: user.membershipStatusChangedBy,
      canceledAt: user.canceledAt,
      cancellationReason: user.cancellationReason,
      delinquentSince: user.delinquentSince,
      reactivatedAt: user.reactivatedAt,

      // その他
      referralCode: user.referralCode,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,

      // リレーション情報
      subscription: user.subscriptions[0] || null,
      referrer: user.referralsAsReferred[0]?.referrer || null,
      referralInfo: user.referralsAsReferred[0] || null,
      fpPromotionApplication: user.fpPromotionApplications[0] || null,
      compensationBankAccount: user.compensationBankAccount || null,

      // 紹介統計（このユーザーが紹介した人数）
      referralStats,

      // Supabase認証情報
      supabaseAuth: supabaseUser ? {
        emailConfirmedAt: supabaseUser.email_confirmed_at,
        lastSignInAt: supabaseUser.last_sign_in_at,
        createdAt: supabaseUser.created_at,
      } : null,
      hasSupabaseAuth: !!supabaseUser,
    }

    return NextResponse.json({ user: userDetail })
  } catch (error) {
    console.error('User detail API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
