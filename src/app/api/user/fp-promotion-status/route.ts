import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 })
    }

    // 環境未設定時はプレースホルダーを返してUIを維持
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ hasApplication: false, application: null, pendingActions: [] })
    }

    // FP昇格申請を取得
    const application = await prisma.fPPromotionApplication.findUnique({
      where: { userId },
    })

    if (!application) {
      return NextResponse.json({ 
        hasApplication: false,
        application: null,
        pendingActions: []
      })
    }

    // 未完了のアクションを特定
    const pendingActions: string[] = []
    if (!application.lpMeetingCompleted) {
      pendingActions.push('lpMeeting')
    }
    if (!application.basicTestCompleted) {
      pendingActions.push('basicTest')
    }
    if (!application.surveyCompleted) {
      pendingActions.push('survey')
    }

    return NextResponse.json({
      hasApplication: true,
      application: {
        id: application.id,
        status: application.status,
        lpMeetingCompleted: application.lpMeetingCompleted,
        basicTestCompleted: application.basicTestCompleted,
        surveyCompleted: application.surveyCompleted,
        appliedAt: application.appliedAt,
      },
      pendingActions
    })
  } catch (error) {
    console.error('API error:', error)
    // Prisma接続失敗時もUIは落とさない
    return NextResponse.json({ hasApplication: false, application: null, pendingActions: [] })
  }
}

