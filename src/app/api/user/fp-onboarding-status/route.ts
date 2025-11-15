import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

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
        fpOnboardingCompleted: true,
        fpOnboardingCompletedAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // FPエイドでない場合は完了扱い
    if (user.role !== 'FP') {
      return NextResponse.json({
        completed: true,
        message: 'FPエイドではないため、オンボーディングは不要です'
      })
    }

    return NextResponse.json({
      completed: user.fpOnboardingCompleted || false,
      completedAt: user.fpOnboardingCompletedAt
    })
  } catch (error) {
    console.error('Get FP onboarding status error:', error)
    return NextResponse.json(
      { error: '完了状況の取得に失敗しました' },
      { status: 500 }
    )
  }
}

