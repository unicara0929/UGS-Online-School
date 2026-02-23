import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, Roles } from '@/lib/auth/api-helpers'

/**
 * FPエイド向け動画ガイダンスの完了状況を取得
 * GET /api/user/fp-onboarding-status
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    if (!authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        role: true,
        fpPromotionApproved: true,
        managerContactConfirmedAt: true,
        complianceTestPassed: true,
        complianceTestPassedAt: true,
        fpOnboardingCompleted: true,
        fpOnboardingCompletedAt: true,
        compensationBankAccount: { select: { id: true } }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // FPエイドでなく、昇格承認もされていない場合はオンボーディング不要
    if (user.role !== Roles.FP && !user.fpPromotionApproved) {
      return NextResponse.json({
        needsOnboarding: false,
        fpPromotionApproved: false,
        managerContactConfirmed: true,
        complianceTestPassed: true,
        fpOnboardingCompleted: true,
        bankAccountRegistered: true,
        message: 'FP昇格申請が承認されていないため、オンボーディングは不要です'
      })
    }

    // オンボーディングが必要（FPエイドまたは承認済みMEMBER）
    const bankAccountRegistered = !!user.compensationBankAccount
    const allComplete =
      !!user.managerContactConfirmedAt &&
      user.complianceTestPassed === true &&
      user.fpOnboardingCompleted === true &&
      bankAccountRegistered

    return NextResponse.json({
      needsOnboarding: !allComplete,
      fpPromotionApproved: user.fpPromotionApproved || false,
      managerContactConfirmed: !!user.managerContactConfirmedAt,
      managerContactConfirmedAt: user.managerContactConfirmedAt,
      complianceTestPassed: user.complianceTestPassed || false,
      complianceTestPassedAt: user.complianceTestPassedAt,
      fpOnboardingCompleted: user.fpOnboardingCompleted || false,
      fpOnboardingCompletedAt: user.fpOnboardingCompletedAt,
      bankAccountRegistered,
      allComplete
    })
  } catch (error) {
    console.error('Get FP onboarding status error:', error)
    return NextResponse.json(
      { error: '完了状況の取得に失敗しました' },
      { status: 500 }
    )
  }
}

