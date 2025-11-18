import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Roles } from '@/lib/auth/api-helpers'

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

    // ユーザー情報を取得（ロール確認のため）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
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
    // ただし、既にFPエイド以上のロール（FP, MANAGER, ADMIN）の場合は空の配列を返す
    let pendingActions: string[] = []

    // UGS会員（MEMBER）の場合のみ、未完了アクションを返す
    if (user.role === Roles.MEMBER) {
      if (!application.lpMeetingCompleted) {
        pendingActions.push('lpMeeting')
      }
      if (!application.basicTestCompleted) {
        pendingActions.push('basicTest')
      }
      if (!application.surveyCompleted) {
        pendingActions.push('survey')
      }
    }
    // FPエイド以上（FP, MANAGER, ADMIN）の場合は、pendingActionsは空のまま

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

