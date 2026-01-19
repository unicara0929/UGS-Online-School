import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 全体MTG免除申請詳細・審査API（管理者用）
 *
 * GET: 申請詳細を取得
 * PATCH: 申請を承認/却下
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { id } = await params

    const exemption = await prisma.mtgExemption.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberId: true,
            role: true,
            phone: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            schedules: {
              orderBy: { date: 'asc' },
              take: 1,
              select: { date: true, time: true }
            }
          },
        },
      },
    })

    if (!exemption) {
      return NextResponse.json(
        { success: false, error: '免除申請が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      exemption: {
        id: exemption.id,
        status: exemption.status,
        reason: exemption.reason,
        adminNotes: exemption.adminNotes,
        reviewedAt: exemption.reviewedAt?.toISOString() ?? null,
        reviewedBy: exemption.reviewedBy,
        createdAt: exemption.createdAt.toISOString(),
        updatedAt: exemption.updatedAt.toISOString(),
        user: exemption.user,
        event: {
          id: exemption.event.id,
          title: exemption.event.title,
          date: exemption.event.schedules[0]?.date?.toISOString() ?? null,
          time: exemption.event.schedules[0]?.time ?? null,
        },
      },
    })
  } catch (error) {
    console.error('[GET_ADMIN_EXEMPTION_DETAIL_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '免除申請の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { id } = await params
    const body = await request.json()
    const { status, adminNotes } = body

    // バリデーション
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'ステータスは APPROVED または REJECTED を指定してください' },
        { status: 400 }
      )
    }

    // 既存の申請を取得
    const existingExemption = await prisma.mtgExemption.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            title: true,
          },
        },
      },
    })

    if (!existingExemption) {
      return NextResponse.json(
        { success: false, error: '免除申請が見つかりません' },
        { status: 404 }
      )
    }

    // 既に審査済みの場合はエラー
    if (existingExemption.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'この申請は既に審査済みです' },
        { status: 400 }
      )
    }

    // 申請を更新
    const exemption = await prisma.mtgExemption.update({
      where: { id },
      data: {
        status,
        adminNotes: adminNotes || null,
        reviewedBy: authUser!.id,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberId: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            schedules: {
              orderBy: { date: 'asc' },
              take: 1,
              select: { date: true }
            }
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: status === 'APPROVED' ? '免除申請を承認しました' : '免除申請を却下しました',
      exemption: {
        id: exemption.id,
        status: exemption.status,
        reason: exemption.reason,
        adminNotes: exemption.adminNotes,
        reviewedAt: exemption.reviewedAt?.toISOString() ?? null,
        reviewedBy: exemption.reviewedBy,
        user: exemption.user,
        event: {
          id: exemption.event.id,
          title: exemption.event.title,
          date: exemption.event.schedules[0]?.date?.toISOString() ?? null,
        },
      },
    })
  } catch (error) {
    console.error('[PATCH_ADMIN_EXEMPTION_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '免除申請の審査に失敗しました' },
      { status: 500 }
    )
  }
}
