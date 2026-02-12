'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { AdminCompensationManagement } from "@/components/admin/admin-compensation-management"

function AdminCompensationPageContent() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="報酬管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <AdminCompensationManagement />
        </main>
      </div>
    </div>
  )
}

export default function AdminCompensationPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminCompensationPageContent />
    </ProtectedRoute>
  )
}

