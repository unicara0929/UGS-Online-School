import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * メール送信履歴詳細取得API
 * GET /api/admin/email-history/[campaignId]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { campaignId } = await context.params

    // キャンペーン情報を取得
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
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
        logs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            sentAt: 'desc',
          },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'メール送信履歴が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: campaign,
    })
  } catch (error) {
    console.error('Get email campaign detail error:', error)
    return NextResponse.json(
      { error: 'メール送信履歴の取得に失敗しました' },
      { status: 500 }
    )
  }
}
