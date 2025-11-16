'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { CourseList } from "@/components/courses/course-list"

function CoursesPageContent() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        <PageHeader title="教育コンテンツ" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <CourseList />
        </main>
      </div>
    </div>
  )
}

export default function CoursesPage() {
  return (
    <ProtectedRoute>
      <CoursesPageContent />
    </ProtectedRoute>
  )
}
