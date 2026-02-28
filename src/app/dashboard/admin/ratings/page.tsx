'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { AdminRatingsDashboard } from '@/components/admin/admin-ratings-dashboard'

function AdminRatingsPageContent() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="動画評価分析" />
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <AdminRatingsDashboard />
        </main>
      </div>
    </div>
  )
}

export default function AdminRatingsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminRatingsPageContent />
    </ProtectedRoute>
  )
}
