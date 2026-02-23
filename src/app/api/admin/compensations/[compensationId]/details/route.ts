import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'

/**
 * 報酬内訳の取得
 * GET /api/admin/compensations/[compensationId]/details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ compensationId: string }> }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { compensationId } = await params

    const details = await prisma.compensationDetail.findMany({
      where: { compensationId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      details,
    })
  } catch (error) {
    console.error('[COMPENSATION_DETAILS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '報酬内訳の取得に失敗しました' },
      { status: 500 }
    )
  }
}
