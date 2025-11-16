import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { UserRole, PromotionStatus } from '@prisma/client'

/**
 * マネージャー昇格申請を却下（管理者用）
 * POST /api/admin/promotions/manager/[applicationId]/reject
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
    const { reason } = await request.json()

    if (!reason) {
      return NextResponse.json(
        { success: false, error: '却下理由は必須です' },
        { status: 400 }
      )
    }

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
      // 申請を却下
      await tx.promotionApplication.update({
        where: { id: applicationId },
        data: {
          status: PromotionStatus.REJECTED,
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      })

      // 通知を作成
      await tx.notification.create({
        data: {
          userId: application.userId,
          type: 'PROMOTION_REJECTED',
          priority: 'INFO',
          title: 'マネージャー昇格申請が却下されました',
          message: `マネージャーへの昇格申請が却下されました。\n\n理由: ${reason}`,
          isRead: false,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'マネージャー昇格申請を却下しました',
    })
  } catch (error) {
    console.error('[ADMIN_MANAGER_PROMOTION_REJECT_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'マネージャー昇格申請の却下に失敗しました' },
      { status: 500 }
    )
  }
}
