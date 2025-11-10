import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 報酬を支払い済みにマーク
 * POST /api/admin/compensations/[compensationId]/pay
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

    // 報酬を支払い済みにマーク
    const updatedCompensation = await prisma.compensation.update({
      where: { id: compensationId },
      data: {
        status: 'PAID'
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
    console.error('Pay compensation error:', error)
    return NextResponse.json(
      { error: '報酬の支払いマークに失敗しました' },
      { status: 500 }
    )
  }
}

