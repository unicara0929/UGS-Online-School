import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, Roles } from '@/lib/auth/api-helpers'
import { UserRole } from '@prisma/client'

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

      // 2. ユーザーのロールをFPに変更
      await tx.user.update({
        where: { id: application.userId },
        data: {
          role: UserRole.FP
        }
      })

      // 3. 通知を作成
      await tx.notification.create({
        data: {
          userId: application.userId,
          type: 'PROMOTION_APPROVED',
          priority: 'SUCCESS',
          title: 'FPエイド昇格申請が承認されました',
          message: 'おめでとうございます！FPエイド昇格申請が承認されました。身分証のアップロードと業務委託契約書の締結を完了してください。',
          actionUrl: '/dashboard/promotion'
        }
      })
    })

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
