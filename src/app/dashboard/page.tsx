'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PaymentGuard } from "@/components/auth/payment-guard"
import { Sidebar } from "@/components/navigation/sidebar"
import { CompensationDashboard } from "@/components/dashboard/compensation-dashboard"
import { CourseList } from "@/components/courses/course-list"
import { FPPromotion } from "@/components/promotion/fp-promotion"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ActionNotifications } from "@/components/dashboard/action-notifications"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { UpcomingEvents } from "@/components/dashboard/upcoming-events"
import { NotificationBar } from "@/components/NotificationBar"
import { FPOnboardingBanner } from "@/components/dashboard/fp-onboarding-banner"
import { useAuth } from "@/contexts/auth-context"
import { Notification, Event } from "@/lib/types"

function Dashboard() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      fetchFPPromotionStatus()
      fetchUpcomingEvents()
    }
  }, [user?.id])

  const fetchFPPromotionStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/user/fp-promotion-status?userId=${user?.id}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('FP昇格申請状態の取得に失敗しました')
      }
      const data = await response.json()

      // FP昇格申請済みで未完了項目がある場合のみアクションを生成
      if (data.hasApplication && data.pendingActions.length > 0) {
        const actionNotifications: Notification[] = []

        if (data.pendingActions.includes('lpMeeting')) {
          actionNotifications.push({
            id: 'fp-promotion-lp-meeting',
            title: 'LP面談の予約をお願いします',
            message: '',
            type: 'action',
            isRead: false,
            createdAt: new Date()
          })
        }

        if (data.pendingActions.includes('basicTest')) {
          actionNotifications.push({
            id: 'fp-promotion-basic-test',
            title: '基礎編テストが利用可能です',
            message: '',
            type: 'action',
            isRead: false,
            createdAt: new Date()
          })
        }

        if (data.pendingActions.includes('survey')) {
          actionNotifications.push({
            id: 'fp-promotion-survey',
            title: 'アンケートの提出をお願いします',
            message: '',
            type: 'action',
            isRead: false,
            createdAt: new Date()
          })
        }

        setNotifications(actionNotifications)
      } else {
        setNotifications([])
      }
    } catch (error) {
      console.error('Error fetching FP promotion status:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch(`/api/events?userId=${user?.id}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('イベント情報の取得に失敗しました')
      }
      const data = await response.json()

      if (data.success && data.events) {
        // 今後のイベントのみをフィルタリング
        const upcoming = data.events.filter((event: Event) => event.status === 'upcoming')
        setUpcomingEvents(upcoming)
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error)
      setUpcomingEvents([])
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        {/* ヘッダー */}
        <DashboardHeader />

        {/* FPオンボーディングバナー */}
        <FPOnboardingBanner />

        {/* 新着通知バー */}
        <NotificationBar />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* アクション必須通知 */}
            {!loading && <ActionNotifications notifications={notifications} />}

            {/* ダッシュボード統計 */}
            <DashboardStats userRole={user?.role || 'member'} />

            {/* 教育コンテンツ一覧 */}
            <CourseList />

            {/* 報酬管理ダッシュボード */}
            <CompensationDashboard userRole={user?.role || 'member'} />

            {/* FP昇格システム */}
            <FPPromotion />

            {/* 今後のイベント */}
            <UpcomingEvents events={upcomingEvents} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <PaymentGuard>
        <Dashboard />
      </PaymentGuard>
    </ProtectedRoute>
  )
}
