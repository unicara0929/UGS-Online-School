import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'

interface SalesData {
  userId: string
  memberId: string
  month: string
  salesAmount: number
  insuredCount: number
}

/**
 * MGR売上CSVの確定（データベースに保存）
 * POST /api/admin/manager-sales/upload/confirm
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
      toAdd: SalesData[]
      toUpdate: SalesData[]
    }

    let addedCount = 0
    let updatedCount = 0
    const errors: string[] = []

    // トランザクションで実行
    await prisma.$transaction(async (tx) => {
      // 新規追加
      for (const data of toAdd) {
        try {
          await tx.managerMonthlySales.create({
            data: {
              userId: data.userId,
              month: data.month,
              salesAmount: data.salesAmount,
              insuredCount: data.insuredCount,
              importedBy: authUser!.id,
              importedAt: new Date(),
            },
          })
          addedCount++
        } catch (error: any) {
          errors.push(`会員番号${data.memberId} 月${data.month}: ${error.message}`)
        }
      }

      // 更新（ロック済みのデータはプレビューで除外済み）
      for (const data of toUpdate) {
        try {
          await tx.managerMonthlySales.update({
            where: {
              userId_month: {
                userId: data.userId,
                month: data.month,
              },
            },
            data: {
              salesAmount: data.salesAmount,
              insuredCount: data.insuredCount,
              importedBy: authUser!.id,
              importedAt: new Date(),
            },
          })
          updatedCount++
        } catch (error: any) {
          errors.push(`会員番号${data.memberId} 月${data.month}: ${error.message}`)
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
    console.error('[MANAGER_SALES_CSV_CONFIRM_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '売上データの保存に失敗しました' },
      { status: 500 }
    )
  }
}
