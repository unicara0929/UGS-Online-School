import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'

interface DetailData {
  memberId: string
  userId: string
  month: string
  amount: number
  businessType: 'REAL_ESTATE' | 'INSURANCE'
  details: Record<string, string>
}

/**
 * 報酬内訳CSVの確定（データベースに保存）
 * CompensationDetail + Contract を同時作成
 * POST /api/admin/compensations/details/upload/confirm
 */
export async function POST(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const { toAdd } = body as { toAdd: DetailData[] }

    let addedCount = 0
    let contractCount = 0
    const errors: string[] = []

    // user+month ごとにグループ化
    const groupedByUserMonth = new Map<string, DetailData[]>()
    for (const item of toAdd) {
      const key = `${item.userId}:${item.month}`
      if (!groupedByUserMonth.has(key)) {
        groupedByUserMonth.set(key, [])
      }
      groupedByUserMonth.get(key)!.push(item)
    }

    // 対象ユーザーのロール情報を取得
    const allUserIds = [...new Set(toAdd.map(d => d.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, role: true }
    })
    const userRoleMap = new Map(users.map(u => [u.id, u.role]))

    await prisma.$transaction(async (tx) => {
      for (const [key, items] of groupedByUserMonth) {
        const [userId, month] = key.split(':')

        try {
          // Compensation を検索、なければ作成
          let compensation = await tx.compensation.findUnique({
            where: { userId_month: { userId, month } },
          })

          if (!compensation) {
            const userRole = userRoleMap.get(userId) || 'FP'
            compensation = await tx.compensation.create({
              data: {
                userId,
                month,
                amount: 0,
                contractCount: 0,
                breakdown: {
                  memberReferral: 0,
                  fpReferral: 0,
                  contract: 0,
                  bonus: 0,
                  deduction: 0,
                },
                earnedAsRole: userRole as 'FP' | 'MANAGER',
                status: 'PAID',
              },
            })
          }

          // CompensationDetail + Contract をバルク作成
          let itemIndex = 0
          for (const item of items) {
            await tx.compensationDetail.create({
              data: {
                compensationId: compensation.id,
                businessType: item.businessType,
                amount: item.amount,
                details: item.details,
              },
            })
            addedCount++

            // Contract を自動作成
            try {
              const monthFormatted = month.replace('-', '')
              itemIndex++

              if (item.businessType === 'REAL_ESTATE') {
                // 不動産: 番号があればそれを使用、なければ自動生成
                const contractNumber = item.details.number
                  ? `${item.details.number}`
                  : `RE-${item.memberId}-${monthFormatted}-${String(itemIndex).padStart(3, '0')}`

                // signedAt: 契約日をパース（YYYY-MM-DD or YYYY/MM/DD 等）
                const signedAt = parseDate(item.details.contractDate, month)

                await tx.contract.upsert({
                  where: { contractNumber },
                  create: {
                    userId,
                    contractNumber,
                    productName: item.details.property || null,
                    contractType: 'REAL_ESTATE',
                    status: 'ACTIVE',
                    signedAt,
                    rewardAmount: item.amount,
                    customerName: item.details.customerName || null,
                  },
                  update: {
                    productName: item.details.property || null,
                    rewardAmount: item.amount,
                    customerName: item.details.customerName || null,
                    signedAt,
                  },
                })
              } else {
                // 保険: 自動生成番号
                const contractNumber = `INS-${item.memberId}-${monthFormatted}-${String(itemIndex).padStart(3, '0')}`

                await tx.contract.upsert({
                  where: { contractNumber },
                  create: {
                    userId,
                    contractNumber,
                    productName: item.details.insuranceType || null,
                    contractType: 'INSURANCE',
                    status: 'ACTIVE',
                    signedAt: new Date(`${month}-01`),
                    rewardAmount: item.amount,
                    customerName: item.details.contractorName || null,
                    note: [item.details.company, item.details.type].filter(Boolean).join(' / ') || null,
                  },
                  update: {
                    productName: item.details.insuranceType || null,
                    rewardAmount: item.amount,
                    customerName: item.details.contractorName || null,
                    note: [item.details.company, item.details.type].filter(Boolean).join(' / ') || null,
                  },
                })
              }
              contractCount++
            } catch (contractError: any) {
              // Contract作成失敗はログだけ出して内訳登録は続行
              console.warn(`[CONTRACT_AUTO_CREATE_WARN] ${item.memberId} ${month}: ${contractError.message}`)
            }
          }

          // Compensation の amount を全 CompensationDetail の合計で更新
          const allDetails = await tx.compensationDetail.findMany({
            where: { compensationId: compensation.id },
            select: { amount: true },
          })
          const totalDetailAmount = allDetails.reduce((sum, d) => sum + d.amount, 0)

          await tx.compensation.update({
            where: { id: compensation.id },
            data: { amount: totalDetailAmount },
          })
        } catch (error: any) {
          errors.push(`ユーザー${userId} 月${month}: ${error.message}`)
        }
      }
    })

    return NextResponse.json({
      success: true,
      summary: {
        added: addedCount,
        contracts: contractCount,
        failed: errors.length,
        errors,
      },
    })
  } catch (error) {
    console.error('[COMPENSATION_DETAIL_CSV_CONFIRM_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '報酬内訳データの保存に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 日付文字列をDateにパース。パース失敗時は対象月の1日をフォールバック
 */
function parseDate(dateStr: string | undefined, month: string): Date {
  if (!dateStr) return new Date(`${month}-01`)

  // YYYY-MM-DD, YYYY/MM/DD 等のパターン
  const cleaned = dateStr.trim().replace(/\//g, '-')
  const parsed = new Date(cleaned)
  if (!isNaN(parsed.getTime())) return parsed

  // フォールバック: 対象月の1日
  return new Date(`${month}-01`)
}
