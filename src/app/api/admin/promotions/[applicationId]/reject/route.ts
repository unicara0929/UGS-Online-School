import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PromotionStatus } from '@prisma/client'

/**
 * 昇格申請を却下
 * POST /api/admin/promotions/[applicationId]/reject
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
      where: { id: applicationId }
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

    // 申請を却下
    const updatedApplication = await prisma.promotionApplication.update({
      where: { id: applicationId },
      data: {
        status: PromotionStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: reviewerId || null,
        reviewNotes: reviewNotes || null
      }
    })

    return NextResponse.json({
      success: true,
      application: {
        id: updatedApplication.id,
        userId: updatedApplication.userId,
        targetRole: updatedApplication.targetRole,
        status: updatedApplication.status,
        reviewedAt: updatedApplication.reviewedAt,
        reviewNotes: updatedApplication.reviewNotes
      }
    })
  } catch (error) {
    console.error('Reject promotion error:', error)
    return NextResponse.json(
      { error: '昇格申請の却下に失敗しました' },
      { status: 500 }
    )
  }
}

