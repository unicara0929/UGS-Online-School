import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ContractStatus } from '@prisma/client'
import { getAuthenticatedUser, checkRole, checkOwnershipOrAdmin, checkAdmin, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * 契約を更新
 * PUT /api/contracts/[contractId]
 * 権限: FP以上、自分のデータのみ（管理者は全データを操作可能）
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ contractId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // FP以上のロールチェック
    const { allowed, error: roleError } = checkRole(authUser!.role, RoleGroups.FP_AND_ABOVE)
    if (!allowed) {
      return roleError || NextResponse.json(
        { error: 'アクセス権限がありません。必要なロール: FP以上' },
        { status: 403 }
      )
    }

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

    // 所有権チェック（自分の契約または管理者のみ更新可能）
    const { allowed: ownershipAllowed, error: ownershipError } = checkOwnershipOrAdmin(
      contract.userId,
      authUser!.id,
      authUser!.role
    )
    if (!ownershipAllowed) {
      return ownershipError || NextResponse.json(
        { error: 'アクセス権限がありません。自分のデータまたは管理者権限が必要です。' },
        { status: 403 }
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
 * 権限: 管理者のみ
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ contractId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

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

