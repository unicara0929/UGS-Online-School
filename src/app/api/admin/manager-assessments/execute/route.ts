import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { executeHalfYearlyAssessment, getAssessmentPeriod, getCurrentAssessmentPeriod } from '@/lib/services/manager-assessment'

/**
 * 半期査定を実行
 * POST /api/admin/manager-assessments/execute
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
    const { year, half } = body as { year?: number; half?: 1 | 2 }

    // 指定がなければ現在の期間
    const period = year && half
      ? getAssessmentPeriod(year, half)
      : getCurrentAssessmentPeriod()

    const result = await executeHalfYearlyAssessment(period, authUser!.id)

    return NextResponse.json({
      ...result,
      period
    })
  } catch (error) {
    console.error('[MANAGER_ASSESSMENT_EXECUTE_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '査定の実行に失敗しました' },
      { status: 500 }
    )
  }
}
