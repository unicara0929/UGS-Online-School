import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 退会申請一覧を取得（管理者）
 * GET /api/admin/cancel-requests
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    const cancelRequests = await prisma.cancelRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      cancelRequests: cancelRequests.map(req => ({
        id: req.id,
        userId: req.userId,
        name: req.name,
        email: req.email,
        reason: req.reason,
        otherReason: req.otherReason,
        continuationOption: req.continuationOption,
        status: req.status,
        isScheduled: req.isScheduled,
        contractEndDate: req.contractEndDate,
        adminNote: req.adminNote,
        processedAt: req.processedAt,
        processedBy: req.processedBy,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        user: req.user
      }))
    })
  } catch (error) {
    console.error('Get cancel requests error:', error)
    return NextResponse.json(
      { error: '退会申請一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
