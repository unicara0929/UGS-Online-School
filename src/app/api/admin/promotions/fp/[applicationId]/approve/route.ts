import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser, checkRole, Roles } from '@/lib/auth/api-helpers'
import { UserRole } from '@prisma/client'
import { sendFPPromotionApprovedEmail } from '@/lib/services/email-service'

/**
 * FPエイド昇格申請を承認
 * POST /api/admin/promotions/fp/[applicationId]/approve
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { allowed, error: roleError } = checkRole(authUser!.role, [Roles.ADMIN])
    if (!allowed) return roleError!

    const { applicationId } = await context.params

    // 申請を取得
    const application = await prisma.fPPromotionApplication.findUnique({
      where: { id: applicationId },
      include: { user: true }
    })

    if (!application) {
      return NextResponse.json(
        { error: '申請が見つかりません' },
        { status: 404 }
      )
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'この申請は既に処理されています' },
        { status: 400 }
      )
    }

    // トランザクションで処理
    await prisma.$transaction(async (tx) => {
      // 1. 申請を承認済みに更新
      await tx.fPPromotionApplication.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date()
        }
      })

      // 2. ユーザーのロールをFPに変更し、オンボーディング未完了フラグを設定
      await tx.user.update({
        where: { id: application.userId },
        data: {
          role: UserRole.FP,
          fpOnboardingCompleted: false // FP昇格時は動画ガイダンス未完了
        }
      })

      // 3. 通知を作成
      await tx.notification.create({
        data: {
          userId: application.userId,
          type: 'PROMOTION_APPROVED',
          priority: 'SUCCESS',
          title: 'FPエイド昇格申請が承認されました',
          message: 'おめでとうございます！FPエイド昇格申請が承認されました。FPエイド向けガイダンス動画の視聴を完了してください。',
          actionUrl: '/dashboard/fp-onboarding'
        }
      })
    })

    // Supabaseのuser_metadataも更新（Prismaと同期）
    try {
      await supabaseAdmin.auth.admin.updateUserById(application.userId, {
        user_metadata: { role: UserRole.FP }
      })
      console.log('Supabase user_metadata updated for FP promotion:', application.userId)
    } catch (supabaseError) {
      console.error('Failed to update Supabase user_metadata:', supabaseError)
      // Supabase更新失敗しても処理は続行（Prismaは既に更新済み）
    }

    // 4. メール送信（二重送信防止：promotionEmailSentフラグをチェック）
    if (!application.promotionEmailSent) {
      try {
        await sendFPPromotionApprovedEmail({
          to: application.user.email,
          userName: application.user.name,
          userEmail: application.user.email
        })

        // メール送信成功後、フラグを更新
        await prisma.fPPromotionApplication.update({
          where: { id: applicationId },
          data: {
            promotionEmailSent: true,
            promotionEmailSentAt: new Date()
          }
        })

        console.log('FP promotion approval email sent to:', application.user.email)
      } catch (emailError) {
        // メール送信失敗してもエラーにはしない（ログのみ）
        console.error('Failed to send promotion approval email:', emailError)
        // メール送信失敗の場合、フラグは更新しない（再試行可能にする）
      }
    } else {
      console.log('Promotion email already sent, skipping')
    }

    return NextResponse.json({
      success: true,
      message: '昇格申請を承認しました'
    })
  } catch (error) {
    console.error('Approve FP promotion application error:', error)
    return NextResponse.json(
      { error: '承認処理に失敗しました' },
      { status: 500 }
    )
  }
}
