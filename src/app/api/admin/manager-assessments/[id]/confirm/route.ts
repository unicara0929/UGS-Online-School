import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { confirmAssessment } from '@/lib/services/manager-assessment'

/**
 * 査定結果を確定
 * POST /api/admin/manager-assessments/[id]/confirm
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params

    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json().catch(() => ({}))
    const { applyRangeChange = true } = body as { applyRangeChange?: boolean }

    const result = await confirmAssessment(assessmentId, authUser!.id, applyRangeChange)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })
  } catch (error) {
    console.error('[MANAGER_ASSESSMENT_CONFIRM_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '査定の確定に失敗しました' },
      { status: 500 }
    )
  }
}
