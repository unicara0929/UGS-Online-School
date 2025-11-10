import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PromotionStatus, UserRole } from '@prisma/client'

/**
 * 昇格申請を承認
 * POST /api/admin/promotions/[applicationId]/approve
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await context.params
    const body = await request.json()
    const { reviewerId, reviewNotes } = body

    if (!applicationId) {
      return NextResponse.json(
        { error: '申請IDが必要です' },
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
            role: true
          }
        }
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: '申請が見つかりません' },
        { status: 404 }
      )
    }

    if (application.status !== PromotionStatus.PENDING) {
      return NextResponse.json(
        { error: 'この申請は既に処理済みです' },
        { status: 400 }
      )
    }

    // 申請を承認
    const updatedApplication = await prisma.promotionApplication.update({
      where: { id: applicationId },
      data: {
        status: PromotionStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: reviewerId || null,
        reviewNotes: reviewNotes || null
      }
    })

    // ユーザーのロールを更新
    await prisma.user.update({
      where: { id: application.userId },
      data: {
        role: application.targetRole
      }
    })

    // FP昇格の場合、FPPromotionApplicationも更新
    if (application.targetRole === UserRole.FP) {
      const fpApplication = await prisma.fPPromotionApplication.findUnique({
        where: { userId: application.userId }
      })

      if (fpApplication) {
        await prisma.fPPromotionApplication.update({
          where: { userId: application.userId },
          data: {
            status: 'APPROVED',
            approvedAt: new Date()
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      application: {
        id: updatedApplication.id,
        userId: updatedApplication.userId,
        targetRole: updatedApplication.targetRole,
        status: updatedApplication.status,
        reviewedAt: updatedApplication.reviewedAt
      }
    })
  } catch (error) {
    console.error('Approve promotion error:', error)
    return NextResponse.json(
      { error: '昇格申請の承認に失敗しました' },
      { status: 500 }
    )
  }
}

