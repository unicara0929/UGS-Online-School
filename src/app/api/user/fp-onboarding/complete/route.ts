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

    // トランザクションで処理
    await prisma.$transaction(async (tx) => {
      // 1. 完了フラグを更新
      await tx.user.update({
        where: { id: authUser.id },
        data: {
          fpOnboardingCompleted: true,
          fpOnboardingCompletedAt: new Date()
        }
      })

      // 2. FP昇格申請のステータスをCOMPLETEDに更新
      // 最新のAPPROVED状態の申請を取得
      const approvedApplication = await tx.fPPromotionApplication.findFirst({
        where: {
          userId: authUser.id,
          status: 'APPROVED'
        },
        orderBy: {
          approvedAt: 'desc'
        }
      })

      if (approvedApplication) {
        // COMPLETED への更新条件: 3つ全て必要
        // 1. FPオンボーディング完了（この関数で更新済み）
        // 2. 業務委託契約書への同意
        // 3. 身分証のアップロード
        const allConditionsMet =
          approvedApplication.contractAgreed &&
          approvedApplication.idDocumentUrl !== null

        if (allConditionsMet) {
          await tx.fPPromotionApplication.update({
            where: { id: approvedApplication.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date()
            }
          })
          console.log('FP promotion application marked as COMPLETED:', approvedApplication.id)
        } else {
          console.log('FP onboarding completed, but waiting for contract agreement and ID document upload')
        }
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

