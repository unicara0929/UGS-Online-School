'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { FPPromotion } from "@/components/promotion/fp-promotion"
import { ManagerPromotion } from "@/components/promotion/manager-promotion"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

function PromotionPageContent() {
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
                <h1 className="text-2xl font-bold text-slate-900">昇格管理</h1>
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

        <main className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* FP昇格（MEMBERユーザー向け） */}
          {user?.role === 'member' && <FPPromotion />}
          
          {/* マネージャー昇格（FPユーザー向け） */}
          {user?.role === 'fp' && <ManagerPromotion />}
          
          {/* その他のロール */}
          {(user?.role === 'manager' || user?.role === 'admin') && (
            <div className="text-center py-8">
              <p className="text-slate-600">現在のロールでは昇格申請はできません</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function PromotionPage() {
  return (
    <ProtectedRoute requiredRoles={['member', 'fp', 'manager']}>
      <PromotionPageContent />
    </ProtectedRoute>
  )
}
