'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PaymentGuard } from "@/components/auth/payment-guard"
import { Sidebar } from "@/components/navigation/sidebar"
import { CompensationDashboard } from "@/components/dashboard/compensation-dashboard"
import { CourseList } from "@/components/courses/course-list"
import { FPPromotion } from "@/components/promotion/fp-promotion"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { UpcomingEvents } from "@/components/dashboard/upcoming-events"
import { NotificationBar } from "@/components/NotificationBar"
import { FPOnboardingBanner } from "@/components/dashboard/fp-onboarding-banner"
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard"
import { FPDashboard } from "@/components/dashboard/fp-dashboard"
import { useAuth } from "@/contexts/auth-context"
import { Event } from "@/lib/types"

function Dashboard() {
  const { user } = useAuth()
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])

  useEffect(() => {
    if (user?.id) {
      fetchUpcomingEvents()
    }
  }, [user?.id])

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
    <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64 min-w-0 overflow-x-hidden">
        {/* ヘッダー */}
        <DashboardHeader />

        {/* FPオンボーディングバナー */}
        <FPOnboardingBanner />

        {/* 新着通知バー */}
        <NotificationBar />

        <main className="px-3 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-x-hidden">
          <div className="space-y-6 sm:space-y-8 max-w-full">
            {/* MGRダッシュボード（マネージャーのみ表示） */}
            {user?.role === 'manager' && <ManagerDashboard />}

            {/* FPエイドダッシュボード（FPのみ表示） */}
            {user?.role === 'fp' && <FPDashboard />}

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
