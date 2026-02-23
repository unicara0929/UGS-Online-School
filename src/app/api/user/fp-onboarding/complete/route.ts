import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { supabaseAdmin } from '@/lib/supabase'

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
        email: true,
        role: true,
        fpPromotionApproved: true,
        fpOnboardingCompleted: true,
        managerContactConfirmedAt: true,
        complianceTestPassed: true,
        compensationBankAccount: { select: { id: true } }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // FP昇格申請が承認されているか、既にFPロールか確認
    // 既にFPロールの場合は昇格済みなのでオンボーディング完了のみ記録
    const isFPOrHigher = user.role === 'FP' || user.role === 'MANAGER' || user.role === 'ADMIN'
    if (!user.fpPromotionApproved && !isFPOrHigher) {
      return NextResponse.json(
        { error: 'FP昇格申請が承認されていません' },
        { status: 400 }
      )
    }

    // 承認済みの申請を取得（ステータス更新用）
    const approvedApplication = await prisma.fPPromotionApplication.findFirst({
      where: {
        userId: authUser.id,
        status: 'APPROVED'
      },
      orderBy: {
        approvedAt: 'desc'
      }
    })

    // 既に完了している場合は成功を返す
    if (user.fpOnboardingCompleted) {
      return NextResponse.json({
        success: true,
        message: '既に完了しています'
      })
    }

    // トランザクションで処理
    const result = await prisma.$transaction(async (tx) => {
      // 1. 完了フラグを更新
      await tx.user.update({
        where: { id: authUser.id },
        data: {
          fpOnboardingCompleted: true,
          fpOnboardingCompletedAt: new Date()
        }
      })

      // 2. オンボーディング完了条件をチェック
      // 3つのステップ:
      // - マネージャー連絡先確認
      // - コンプライアンステスト合格
      // - ガイダンス動画視聴（この関数で完了）
      const allOnboardingComplete =
        user.managerContactConfirmedAt !== null &&
        user.complianceTestPassed === true &&
        user.compensationBankAccount !== null
        // fpOnboardingCompleted は今更新するので true とみなす

      if (allOnboardingComplete) {
        // 全オンボーディング完了 → FPロールに昇格
        await tx.user.update({
          where: { id: authUser.id },
          data: {
            role: UserRole.FP,
            fpPromotionApproved: false // 昇格完了後はフラグをリセット
          }
        })

        // 申請ステータスをCOMPLETEDに更新（申請がある場合）
        if (approvedApplication) {
          await tx.fPPromotionApplication.update({
            where: { id: approvedApplication.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date()
            }
          })
        }

        console.log('All onboarding steps completed, user promoted to FP')
        return { promoted: true }
      }

      return { promoted: false }
    })

    // FPに昇格した場合、Supabaseのロールも更新
    if (result.promoted) {
      try {
        const supabaseUser = await supabaseAdmin.auth.admin.listUsers()
        const supaUser = supabaseUser.data.users.find(u => u.email === user.email)

        if (supaUser) {
          await supabaseAdmin.auth.admin.updateUserById(supaUser.id, {
            user_metadata: {
              ...supaUser.user_metadata,
              role: 'fp'
            }
          })
          console.log('Supabase user role updated to FP')
        }
      } catch (supabaseError) {
        console.error('Failed to update Supabase user role:', supabaseError)
        // Supabaseの更新に失敗しても処理は続行
      }
    }

    return NextResponse.json({
      success: true,
      message: result.promoted
        ? 'オンボーディング完了！FPエイドに昇格しました'
        : '動画ガイダンスの視聴を完了しました',
      promoted: result.promoted
    })
  } catch (error) {
    console.error('Complete FP onboarding error:', error)
    return NextResponse.json(
      { error: '完了処理に失敗しました' },
      { status: 500 }
    )
  }
}

