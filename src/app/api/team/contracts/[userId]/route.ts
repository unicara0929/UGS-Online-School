import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 特定FPエイドの契約一覧取得 API
 * マネージャーが担当FPエイドの契約詳細を確認する
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const currentUserId = authUser!.id
    const currentUserRole = authUser!.role

    // MANAGER または ADMIN のみアクセス可能
    if (!['MANAGER', 'ADMIN'].includes(currentUserRole)) {
      return NextResponse.json(
        { success: false, error: 'この機能にアクセスする権限がありません' },
        { status: 403 }
      )
    }

    const { userId } = await context.params

    // マネージャーの場合、担当FPエイドのみアクセス可能
    if (currentUserRole === 'MANAGER') {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { managerId: true, role: true }
      })

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: 'ユーザーが見つかりません' },
          { status: 404 }
        )
      }

      if (targetUser.managerId !== currentUserId) {
        return NextResponse.json(
          { success: false, error: 'このユーザーの情報にアクセスする権限がありません' },
          { status: 403 }
        )
      }
    }

    // ユーザー情報を取得
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 契約一覧を取得
    const contracts = await prisma.contract.findMany({
      where: {
        userId: userId,
        status: 'ACTIVE'
      },
      orderBy: {
        signedAt: 'desc'
      }
    })

    // 契約種別ごとの集計
    const contractsByType = contracts.reduce((acc, contract) => {
      const type = contract.contractType
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalAmount: 0,
          totalReward: 0,
          contracts: []
        }
      }
      acc[type].count++
      acc[type].totalAmount += contract.amount || 0
      acc[type].totalReward += contract.rewardAmount || 0
      acc[type].contracts.push({
        id: contract.id,
        contractNumber: contract.contractNumber,
        productName: contract.productName,
        customerName: contract.customerName,
        amount: contract.amount,
        rewardAmount: contract.rewardAmount,
        signedAt: contract.signedAt.toISOString(),
        note: contract.note
      })
      return acc
    }, {} as Record<string, { count: number; totalAmount: number; totalReward: number; contracts: any[] }>)

    // 合計
    const totals = {
      count: contracts.length,
      totalAmount: contracts.reduce((sum, c) => sum + (c.amount || 0), 0),
      totalReward: contracts.reduce((sum, c) => sum + (c.rewardAmount || 0), 0)
    }

    return NextResponse.json({
      success: true,
      user: targetUser,
      contractsByType,
      totals
    })
  } catch (error) {
    console.error('[TEAM_CONTRACTS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '契約情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
