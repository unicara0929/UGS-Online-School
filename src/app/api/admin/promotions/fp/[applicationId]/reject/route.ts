import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, Roles } from '@/lib/auth/api-helpers'

/**
 * FPエイド昇格申請を却下
 * POST /api/admin/promotions/fp/[applicationId]/reject
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
    const { reason } = await request.json()

    if (!reason) {
      return NextResponse.json(
        { error: '却下理由が必要です' },
        { status: 400 }
      )
    }

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
      // 1. 申請を却下に更新
      await tx.fPPromotionApplication.update({
        where: { id: applicationId },
        data: {
          status: 'REJECTED'
        }
      })

      // 2. 通知を作成
      await tx.notification.create({
        data: {
          userId: application.userId,
          type: 'PROMOTION_REJECTED',
          priority: 'CRITICAL',
          title: 'FPエイド昇格申請が却下されました',
          message: `FPエイド昇格申請が却下されました。\n\n理由: ${reason}\n\n条件を再度確認し、必要に応じて再申請してください。`,
          actionUrl: '/dashboard/promotion'
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: '昇格申請を却下しました'
    })
  } catch (error) {
    console.error('Reject FP promotion application error:', error)
    return NextResponse.json(
      { error: '却下処理に失敗しました' },
      { status: 500 }
    )
  }
}
