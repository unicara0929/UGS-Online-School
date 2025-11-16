'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { CsvUploadManager } from "@/components/admin/csv-upload-manager"

function CsvUploadPageContent() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <PageHeader title="CSV一括アップロード" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <CsvUploadManager />
        </main>
      </div>
    </div>
  )
}

export default function CsvUploadPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <CsvUploadPageContent />
    </ProtectedRoute>
  )
}
