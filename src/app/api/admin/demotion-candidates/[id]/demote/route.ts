import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { demoteManager } from '@/lib/services/manager-assessment'

/**
 * 降格処理を実行
 * POST /api/admin/demotion-candidates/[id]/demote
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

    const result = await demoteManager(assessmentId, authUser!.id)

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
    console.error('[DEMOTION_EXECUTE_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '降格処理に失敗しました' },
      { status: 500 }
    )
  }
}
