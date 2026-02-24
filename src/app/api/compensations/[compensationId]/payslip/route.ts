import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 支払明細書のSigned URL取得API
 * GET /api/compensations/[compensationId]/payslip
 *
 * アクセス制御: 本人のみ閲覧可能
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ compensationId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { compensationId } = await params

    // Compensationレコードを取得
    const compensation = await prisma.compensation.findUnique({
      where: { id: compensationId },
      select: { userId: true, payslipPath: true },
    })

    if (!compensation) {
      return NextResponse.json(
        { success: false, error: '報酬レコードが見つかりません' },
        { status: 404 }
      )
    }

    // アクセス制御: 本人のみ
    if (compensation.userId !== authUser!.id) {
      return NextResponse.json(
        { success: false, error: 'この明細書にアクセスする権限がありません' },
        { status: 403 }
      )
    }

    if (!compensation.payslipPath) {
      return NextResponse.json(
        { success: false, error: '支払明細書がアップロードされていません' },
        { status: 404 }
      )
    }

    // Signed URL生成（5分有効）
    const { data, error: signedUrlError } = await supabaseAdmin.storage
      .from('compensation-payslips')
      .createSignedUrl(compensation.payslipPath, 300)

    if (signedUrlError || !data) {
      console.error('[PAYSLIP_SIGNED_URL_ERROR]', signedUrlError)
      return NextResponse.json(
        { success: false, error: '明細書URLの生成に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: data.signedUrl,
    })
  } catch (error) {
    console.error('[PAYSLIP_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '支払明細書の取得に失敗しました' },
      { status: 500 }
    )
  }
}
