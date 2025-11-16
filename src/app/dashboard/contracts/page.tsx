'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { ContractList } from "@/components/contracts/contract-list"

function ContractsPageContent() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        <PageHeader title="契約管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <ContractList />
        </main>
      </div>
    </div>
  )
}

export default function ContractsPage() {
  return (
    <ProtectedRoute requiredRoles={['fp', 'manager', 'admin']}>
      <ContractsPageContent />
    </ProtectedRoute>
  )
}

