import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * FP昇格申請情報を取得
 * GET /api/user/fp-promotion-application?userId={userId}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      )
    }

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

