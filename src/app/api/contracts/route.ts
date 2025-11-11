import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ContractType, ContractStatus } from '@prisma/client'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * 契約一覧を取得
 * GET /api/contracts
 * 権限: FP以上、自分のデータのみ
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ContractStatus | null

    // 認証ユーザーのデータのみを取得
    const where: any = {
      userId: authUser!.id
    }

    if (status) {
      where.status = status
    }

    const contracts = await prisma.contract.findMany({
      where,
      orderBy: {
        signedAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      contracts: contracts.map(contract => ({
        id: contract.id,
        userId: contract.userId,
        contractNumber: contract.contractNumber,
        contractType: contract.contractType,
        status: contract.status,
        signedAt: contract.signedAt,
        amount: contract.amount,
        rewardAmount: contract.rewardAmount,
        createdAt: contract.createdAt
      }))
    })
  } catch (error) {
    console.error('Get contracts error:', error)
    return NextResponse.json(
      { error: '契約一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 契約を登録
 * POST /api/contracts
 * 権限: FP以上、自分のデータのみ
 */
export async function POST(request: NextRequest) {
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

    const { contractNumber, contractType, signedAt, amount } = await request.json()

    if (!contractNumber || !contractType || !signedAt) {
      return NextResponse.json(
        { error: '契約番号、契約タイプ、契約日が必要です' },
        { status: 400 }
      )
    }

    // 契約タイプの検証
    if (!['INSURANCE', 'OTHER'].includes(contractType)) {
      return NextResponse.json(
        { error: '無効な契約タイプです' },
        { status: 400 }
      )
    }

    // 契約番号の重複チェック
    const existingContract = await prisma.contract.findUnique({
      where: { contractNumber }
    })

    if (existingContract) {
      return NextResponse.json(
        { error: 'この契約番号は既に登録されています' },
        { status: 409 }
      )
    }

    // 報酬金額を計算（契約タイプに応じて）
    let rewardAmount = 0
    if (contractType === 'INSURANCE' && amount) {
      // 保険契約の場合、契約金額の一定割合（例: 5%）
      rewardAmount = Math.floor(amount * 0.05)
    }

    // 契約を登録（認証済みユーザーのIDを使用）
    const contract = await prisma.contract.create({
      data: {
        userId: authUser!.id,
        contractNumber,
        contractType: contractType as ContractType,
        status: ContractStatus.ACTIVE,
        signedAt: new Date(signedAt),
        amount: amount || null,
        rewardAmount: rewardAmount > 0 ? rewardAmount : null
      }
    })

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        userId: contract.userId,
        contractNumber: contract.contractNumber,
        contractType: contract.contractType,
        status: contract.status,
        signedAt: contract.signedAt,
        amount: contract.amount,
        rewardAmount: contract.rewardAmount,
        createdAt: contract.createdAt
      }
    })
  } catch (error: any) {
    console.error('Create contract error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'この契約番号は既に登録されています' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: '契約の登録に失敗しました' },
      { status: 500 }
    )
  }
}

