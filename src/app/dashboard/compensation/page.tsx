'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { CompensationDashboard } from "@/components/dashboard/compensation-dashboard"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

function CompensationPageContent() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        {/* ヘッダー */}
        <header className="bg-white shadow-lg border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-slate-900">報酬管理</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{user?.name}</span>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    ログアウト
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

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
