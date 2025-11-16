import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'

interface ContractData {
  userId: string
  contractNumber: string
  productName: string
  amount: number
  signedAt: string
  status: string
}

/**
 * 契約一覧CSVの確定（データベースに保存）
 * POST /api/admin/contracts/upload/confirm
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const { toAdd, toUpdate } = body as {
      toAdd: ContractData[]
      toUpdate: ContractData[]
    }

    let addedCount = 0
    let updatedCount = 0
    const errors: string[] = []

    // トランザクションで実行
    await prisma.$transaction(async (tx) => {
      // 新規追加
      for (const data of toAdd) {
        try {
          await tx.contract.create({
            data: {
              userId: data.userId,
              contractNumber: data.contractNumber,
              productName: data.productName,
              contractType: 'INSURANCE', // デフォルトで保険契約
              status: data.status as any,
              signedAt: new Date(data.signedAt),
              amount: data.amount,
              rewardAmount: null,
            },
          })
          addedCount++
        } catch (error: any) {
          errors.push(`契約番号${data.contractNumber}: ${error.message}`)
        }
      }

      // 更新
      for (const data of toUpdate) {
        try {
          await tx.contract.update({
            where: {
              contractNumber: data.contractNumber,
            },
            data: {
              userId: data.userId,
              productName: data.productName,
              status: data.status as any,
              signedAt: new Date(data.signedAt),
              amount: data.amount,
            },
          })
          updatedCount++
        } catch (error: any) {
          errors.push(`契約番号${data.contractNumber}: ${error.message}`)
        }
      }
    })

    return NextResponse.json({
      success: true,
      summary: {
        added: addedCount,
        updated: updatedCount,
        failed: errors.length,
        errors,
      },
    })
  } catch (error) {
    console.error('[CONTRACT_CSV_CONFIRM_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '契約データの保存に失敗しました' },
      { status: 500 }
    )
  }
}
