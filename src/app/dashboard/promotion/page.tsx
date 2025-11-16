'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { FPPromotion } from "@/components/promotion/fp-promotion"
import { ManagerPromotion } from "@/components/promotion/manager-promotion"
import { useAuth } from "@/contexts/auth-context"

function PromotionPageContent() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        <PageHeader title="昇格管理" />

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
