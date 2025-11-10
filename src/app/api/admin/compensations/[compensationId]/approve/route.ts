import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 報酬を承認
 * POST /api/admin/compensations/[compensationId]/approve
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ compensationId: string }> }
) {
  try {
    const { compensationId } = await context.params

    if (!compensationId) {
      return NextResponse.json(
        { error: '報酬IDが必要です' },
        { status: 400 }
      )
    }

    // 報酬を取得
    const compensation = await prisma.compensation.findUnique({
      where: { id: compensationId }
    })

    if (!compensation) {
      return NextResponse.json(
        { error: '報酬が見つかりません' },
        { status: 404 }
      )
    }

    // 報酬を承認
    const updatedCompensation = await prisma.compensation.update({
      where: { id: compensationId },
      data: {
        status: 'CONFIRMED'
      }
    })

    return NextResponse.json({
      success: true,
      compensation: {
        id: updatedCompensation.id,
        userId: updatedCompensation.userId,
        month: updatedCompensation.month,
        amount: updatedCompensation.amount,
        status: updatedCompensation.status
      }
    })
  } catch (error) {
    console.error('Approve compensation error:', error)
    return NextResponse.json(
      { error: '報酬の承認に失敗しました' },
      { status: 500 }
    )
  }
}

