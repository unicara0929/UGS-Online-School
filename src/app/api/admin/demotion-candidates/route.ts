import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'

/**
 * 降格候補一覧取得
 * GET /api/admin/demotion-candidates
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    // 降格候補の査定結果を取得（PENDING ステータスのみ）
    const demotionCandidates = await prisma.managerAssessment.findMany({
      where: {
        isDemotionCandidate: true,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            memberId: true,
            name: true,
            email: true,
            role: true,
            managerPromotedAt: true,
            managerRange: {
              select: {
                name: true,
                rangeNumber: true,
              }
            }
          }
        },
        previousRange: {
          select: {
            name: true,
            rangeNumber: true,
          }
        }
      },
      orderBy: [
        { periodYear: 'desc' },
        { periodHalf: 'desc' },
        { totalSales: 'asc' } // 売上が低い順
      ]
    })

    // 期間別集計
    const periodSummary = await prisma.managerAssessment.groupBy({
      by: ['periodYear', 'periodHalf'],
      where: {
        isDemotionCandidate: true,
        status: 'PENDING'
      },
      _count: { id: true }
    })

    return NextResponse.json({
      success: true,
      candidates: demotionCandidates.map(c => ({
        ...c,
        periodLabel: `${c.periodYear}年${c.periodHalf === 1 ? '上期' : '下期'}`
      })),
      totalCount: demotionCandidates.length,
      periodSummary: periodSummary.map(p => ({
        year: p.periodYear,
        half: p.periodHalf,
        label: `${p.periodYear}年${p.periodHalf === 1 ? '上期' : '下期'}`,
        count: p._count.id
      }))
    })
  } catch (error) {
    console.error('[DEMOTION_CANDIDATES_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '降格候補の取得に失敗しました' },
      { status: 500 }
    )
  }
}
