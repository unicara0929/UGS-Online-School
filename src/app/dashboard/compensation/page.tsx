'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { CompensationDashboard } from "@/components/dashboard/compensation-dashboard"
import { useAuth } from "@/contexts/auth-context"

function CompensationPageContent() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        <PageHeader title="報酬管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <CompensationDashboard userRole={user?.role || 'member'} />
        </main>
      </div>
    </div>
  )
}

export default function CompensationPage() {
  return (
    <ProtectedRoute requiredRoles={['fp', 'manager', 'admin']}>
      <CompensationPageContent />
    </ProtectedRoute>
  )
}
