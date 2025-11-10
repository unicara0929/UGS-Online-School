import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ContractStatus } from '@prisma/client'

/**
 * 契約を更新
 * PUT /api/contracts/[contractId]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await context.params
    const body = await request.json()
    const { status, amount, rewardAmount } = body

    if (!contractId) {
      return NextResponse.json(
        { error: '契約IDが必要です' },
        { status: 400 }
      )
    }

    // 契約を取得
    const contract = await prisma.contract.findUnique({
      where: { id: contractId }
    })

    if (!contract) {
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      )
    }

    // 更新データを準備
    const updateData: any = {}
    if (status && Object.values(ContractStatus).includes(status)) {
      updateData.status = status
    }
    if (amount !== undefined) {
      updateData.amount = amount
    }
    if (rewardAmount !== undefined) {
      updateData.rewardAmount = rewardAmount
    }

    // 契約を更新
    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      contract: {
        id: updatedContract.id,
        userId: updatedContract.userId,
        contractNumber: updatedContract.contractNumber,
        contractType: updatedContract.contractType,
        status: updatedContract.status,
        signedAt: updatedContract.signedAt,
        amount: updatedContract.amount,
        rewardAmount: updatedContract.rewardAmount,
        updatedAt: updatedContract.updatedAt
      }
    })
  } catch (error) {
    console.error('Update contract error:', error)
    return NextResponse.json(
      { error: '契約の更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 契約を削除
 * DELETE /api/contracts/[contractId]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await context.params

    if (!contractId) {
      return NextResponse.json(
        { error: '契約IDが必要です' },
        { status: 400 }
      )
    }

    // 契約を削除
    await prisma.contract.delete({
      where: { id: contractId }
    })

    return NextResponse.json({
      success: true
    })
  } catch (error: any) {
    console.error('Delete contract error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '契約の削除に失敗しました' },
      { status: 500 }
    )
  }
}

