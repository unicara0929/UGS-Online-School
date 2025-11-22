import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// 新着判定の日数（この日数以内に更新されたコンテンツを新着とみなす）
const NEW_BADGE_DAYS = 7

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
    }

    // ユーザーのカテゴリ別最終閲覧日時を取得
    const categoryViews = await prisma.userCategoryView.findMany({
      where: { userId: authUser.id },
    })

    // カテゴリ別のlastViewedAtをマップに変換
    const lastViewedMap: Record<string, Date | null> = {
      EVENTS: null,
      COURSES: null,
      MATERIALS: null,
      NOTIFICATIONS: null,
    }
    categoryViews.forEach((view) => {
      lastViewedMap[view.category] = view.lastViewedAt
    })

    // 新着判定の基準日時
    const newBadgeThreshold = new Date()
    newBadgeThreshold.setDate(newBadgeThreshold.getDate() - NEW_BADGE_DAYS)

    // ユーザー情報を取得してロールを確認
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { role: true }
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    // 各カテゴリの新着件数をカウント
    const [eventsCount, coursesCount, materialsCount, notificationsCount] = await Promise.all([
      // イベント: ユーザーの最終閲覧日時より後に更新されたものをカウント
      prisma.event.count({
        where: {
          updatedAt: {
            gt: lastViewedMap.EVENTS || new Date(0),
          },
          status: 'UPCOMING',
        },
      }),

      // 教育コンテンツ（コース）: 公開済みで、最終閲覧日時より後に更新されたもの
      prisma.course.count({
        where: {
          updatedAt: {
            gt: lastViewedMap.COURSES || new Date(0),
          },
          isPublished: true,
        },
      }),

      // 資料コンテンツ: ユーザーのロールで閲覧可能なもの
      prisma.material.count({
        where: {
          updatedAt: {
            gt: lastViewedMap.MATERIALS || new Date(0),
          },
          viewableRoles: {
            has: user.role,
          },
        },
      }),

      // 通知: 未読の通知をカウント（既存の未読管理を活用）
      prisma.notification.count({
        where: {
          userId: authUser.id,
          isRead: false,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      badges: {
        events: eventsCount,
        courses: coursesCount,
        materials: materialsCount,
        notifications: notificationsCount,
      },
    })
  } catch (error) {
    console.error('Error fetching badge status:', error)
    return NextResponse.json(
      { success: false, error: 'バッジ状態の取得に失敗しました' },
      { status: 500 }
    )
  }
}
