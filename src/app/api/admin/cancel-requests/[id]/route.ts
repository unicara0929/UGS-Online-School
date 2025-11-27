import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 退会申請詳細を取得（管理者）
 * GET /api/admin/cancel-requests/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const cancelRequest = await prisma.cancelRequest.findUnique({
      where: { id },
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

    if (!cancelRequest) {
      return NextResponse.json(
        { error: '退会申請が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      cancelRequest
    })
  } catch (error) {
    console.error('Get cancel request error:', error)
    return NextResponse.json(
      { error: '退会申請の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 退会申請を更新（管理者）
 * PATCH /api/admin/cancel-requests/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const { status, adminNote } = body

    // 既存の退会申請を取得
    const existingRequest = await prisma.cancelRequest.findUnique({
      where: { id }
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: '退会申請が見つかりません' },
        { status: 404 }
      )
    }

    // 更新データを構築
    const updateData: any = {
      updatedAt: new Date()
    }

    if (status) {
      updateData.status = status
      // ステータスがPENDING以外に変更された場合、処理情報を記録
      if (status !== 'PENDING') {
        updateData.processedAt = new Date()
        updateData.processedBy = authUser!.id
      }
    }

    if (adminNote !== undefined) {
      updateData.adminNote = adminNote
    }

    const updatedRequest = await prisma.cancelRequest.update({
      where: { id },
      data: updateData,
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
      cancelRequest: updatedRequest
    })
  } catch (error) {
    console.error('Update cancel request error:', error)
    return NextResponse.json(
      { error: '退会申請の更新に失敗しました' },
      { status: 500 }
    )
  }
}
