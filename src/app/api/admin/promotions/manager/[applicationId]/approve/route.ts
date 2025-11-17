import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { UserRole, PromotionStatus } from '@prisma/client'

/**
 * マネージャー昇格申請を承認（管理者用）
 * POST /api/admin/promotions/manager/[applicationId]/approve
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { applicationId } = await params

    // 申請を取得
    const application = await prisma.promotionApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    if (!application) {
      return NextResponse.json(
        { success: false, error: '申請が見つかりません' },
        { status: 404 }
      )
    }

    // マネージャー昇格申請かチェック
    if (application.targetRole !== UserRole.MANAGER) {
      return NextResponse.json(
        { success: false, error: 'マネージャー昇格申請ではありません' },
        { status: 400 }
      )
    }

    // 既に処理済みかチェック
    if (application.status !== PromotionStatus.PENDING) {
      return NextResponse.json(
        { success: false, error: '既に処理済みの申請です' },
        { status: 400 }
      )
    }

    // トランザクションで処理
    await prisma.$transaction(async (tx) => {
      // 申請を承認
      await tx.promotionApplication.update({
        where: { id: applicationId },
        data: {
          status: PromotionStatus.APPROVED,
          approvedAt: new Date(),
        },
      })

      // ユーザーロールをMANAGERに更新
      await tx.user.update({
        where: { id: application.userId },
        data: {
          role: UserRole.MANAGER,
        },
      })

      // 通知を作成
      await tx.notification.create({
        data: {
          userId: application.userId,
          type: 'PROMOTION_APPROVED',
          priority: 'SUCCESS',
          title: 'マネージャー昇格が承認されました',
          message: `おめでとうございます！マネージャーへの昇格申請が承認されました。`,
          isRead: false,
        },
      })
    })

    // Supabaseのuser_metadataも更新（Prismaと同期）
    try {
      await supabaseAdmin.auth.admin.updateUserById(application.userId, {
        user_metadata: { role: UserRole.MANAGER }
      })
      console.log('Supabase user_metadata updated for Manager promotion:', application.userId)
    } catch (supabaseError) {
      console.error('Failed to update Supabase user_metadata:', supabaseError)
      // Supabase更新失敗しても処理は続行（Prismaは既に更新済み）
    }

    return NextResponse.json({
      success: true,
      message: 'マネージャー昇格申請を承認しました',
    })
  } catch (error) {
    console.error('[ADMIN_MANAGER_PROMOTION_APPROVE_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'マネージャー昇格申請の承認に失敗しました' },
      { status: 500 }
    )
  }
}
