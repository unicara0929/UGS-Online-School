import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * FP昇格申請情報を取得
 * GET /api/user/fp-promotion-application?userId={userId}
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // クエリパラメータのuserIdを使わず、認証ユーザーのIDを使用
    const userId = authUser!.id

    const application = await prisma.fPPromotionApplication.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        status: true,
        idDocumentUrl: true,
        basicTestCompleted: true,
        lpMeetingCompleted: true,
        surveyCompleted: true,
        appliedAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      application: application || null
    })
  } catch (error: any) {
    console.error('Get FP promotion application error:', error)
    return NextResponse.json(
      { error: '申請情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

