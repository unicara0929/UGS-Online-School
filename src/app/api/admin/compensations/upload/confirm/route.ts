import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'

interface CompensationData {
  memberId: string
  userId: string
  month: string
  grossAmount: number
  withholdingTax: number
  transferFee: number
  netAmount: number
}

/**
 * 報酬サマリーCSVの確定（データベースに保存）
 * POST /api/admin/compensations/upload/confirm
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
      toAdd: CompensationData[]
      toUpdate: CompensationData[]
    }

    let addedCount = 0
    let updatedCount = 0
    const errors: string[] = []

    // 対象ユーザーのロール情報を取得
    const allUserIds = [...new Set([...toAdd.map(d => d.userId), ...toUpdate.map(d => d.userId)])]
    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, role: true }
    })
    const userRoleMap = new Map(users.map(u => [u.id, u.role]))

    // トランザクションで実行
    await prisma.$transaction(async (tx) => {
      // 新規追加
      for (const data of toAdd) {
        try {
          const userRole = userRoleMap.get(data.userId) || 'FP'

          await tx.compensation.create({
            data: {
              userId: data.userId,
              month: data.month,
              amount: data.grossAmount,
              withholdingTax: data.withholdingTax,
              transferFee: data.transferFee,
              contractCount: 0,
              breakdown: {
                memberReferral: 0,
                fpReferral: 0,
                contract: data.grossAmount,
                bonus: 0,
                deduction: 0,
              },
              earnedAsRole: userRole as 'FP' | 'MANAGER',
              status: 'PAID',
            },
          })
          addedCount++
        } catch (error: any) {
          errors.push(`${data.memberId} ${data.month}: ${error.message}`)
        }
      }

      // 更新
      for (const data of toUpdate) {
        try {
          await tx.compensation.update({
            where: {
              userId_month: {
                userId: data.userId,
                month: data.month,
              },
            },
            data: {
              amount: data.grossAmount,
              withholdingTax: data.withholdingTax,
              transferFee: data.transferFee,
              contractCount: 0,
              breakdown: {
                memberReferral: 0,
                fpReferral: 0,
                contract: data.grossAmount,
                bonus: 0,
                deduction: 0,
              },
              status: 'PAID',
            },
          })
          updatedCount++
        } catch (error: any) {
          errors.push(`${data.memberId} ${data.month}: ${error.message}`)
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
    console.error('[COMPENSATION_CSV_CONFIRM_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '報酬データの保存に失敗しました' },
      { status: 500 }
    )
  }
}
