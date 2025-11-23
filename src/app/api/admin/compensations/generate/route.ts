import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateMonthlyCompensation, calculateTotalCompensation } from '@/lib/services/compensation-calculator'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 月次報酬を生成（ADMIN専用）
 * POST /api/admin/compensations/generate
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { month, userIds } = await request.json()

    if (!month) {
      return NextResponse.json(
        { error: '対象月（YYYY-MM形式）が必要です' },
        { status: 400 }
      )
    }

    // 月形式の検証
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: '無効な月形式です。YYYY-MM形式で指定してください' },
        { status: 400 }
      )
    }

    // 対象ユーザーを取得（FPエイド以上のみ）
    const where: any = {
      role: {
        in: ['FP', 'MANAGER', 'ADMIN']
      }
    }

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      where.id = {
        in: userIds
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })

    const results = []

    for (const user of users) {
      try {
        // 既存の報酬をチェック
        const existingCompensation = await prisma.compensation.findUnique({
          where: {
            userId_month: {
              userId: user.id,
              month
            }
          }
        })

        if (existingCompensation) {
          console.log(`Compensation already exists for user ${user.id}, month ${month}`)
          results.push({
            userId: user.id,
            success: false,
            error: '既に報酬が存在します'
          })
          continue
        }

        // 報酬を計算
        const breakdown = await calculateMonthlyCompensation(user.id, month)
        const totalAmount = calculateTotalCompensation(breakdown)

        // 報酬が0の場合はスキップ
        if (totalAmount === 0) {
          console.log(`No compensation for user ${user.id}, month ${month}`)
          results.push({
            userId: user.id,
            success: true,
            skipped: true,
            message: '報酬が0のためスキップしました'
          })
          continue
        }

        // 報酬を作成（発生時点のロールを記録）
        const compensation = await prisma.compensation.create({
          data: {
            userId: user.id,
            month,
            amount: totalAmount,
            breakdown: breakdown as any,
            earnedAsRole: user.role as 'FP' | 'MANAGER', // 報酬発生時のロールを記録
            status: 'PENDING'
          }
        })

        results.push({
          userId: user.id,
          success: true,
          compensation: {
            id: compensation.id,
            amount: compensation.amount,
            month: compensation.month
          }
        })
      } catch (error: any) {
        console.error(`Error processing user ${user.id}:`, error)
        results.push({
          userId: user.id,
          success: false,
          error: error.message || '報酬生成エラー'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: users.length,
        succeeded: results.filter(r => r.success && !r.skipped).length,
        skipped: results.filter(r => r.skipped).length,
        failed: results.filter(r => !r.success).length
      }
    })
  } catch (error) {
    console.error('Generate compensation error:', error)
    return NextResponse.json(
      { error: '報酬生成に失敗しました' },
      { status: 500 }
    )
  }
}

