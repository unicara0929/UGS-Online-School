import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, Roles } from '@/lib/auth/api-helpers'

/**
 * FPエイド向け動画ガイダンスの完了を記録
 * POST /api/user/fp-onboarding/complete
 */
export async function POST(request: NextRequest) {
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
        fpOnboardingCompleted: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // FPエイドでない場合はエラー
    if (user.role !== Roles.FP) {
      return NextResponse.json(
        { error: 'FPエイドではないため、オンボーディングは不要です' },
        { status: 400 }
      )
    }

    // 既に完了している場合は成功を返す
    if (user.fpOnboardingCompleted) {
      return NextResponse.json({
        success: true,
        message: '既に完了しています'
      })
    }

    // 完了フラグを更新
    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        fpOnboardingCompleted: true,
        fpOnboardingCompletedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: '動画ガイダンスの視聴を完了しました'
    })
  } catch (error) {
    console.error('Complete FP onboarding error:', error)
    return NextResponse.json(
      { error: '完了処理に失敗しました' },
      { status: 500 }
    )
  }
}

