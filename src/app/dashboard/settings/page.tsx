'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { SubscriptionGuard } from "@/components/auth/subscription-guard"
import { Sidebar } from "@/components/navigation/sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Bell, Shield, UserX, ArrowRight, CreditCard, Building2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

function SettingsListPage() {
  const { canAccessFPContent } = useAuth()

  const settingsItems = [
    {
      id: 'profile',
      title: 'プロフィール設定',
      description: 'アカウント情報の管理',
      icon: User,
      href: '/dashboard/settings/profile',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'subscription',
      title: 'サブスクリプション管理',
      description: '決済情報と請求履歴の管理',
      icon: CreditCard,
      href: '/dashboard/settings/subscription',
      color: 'from-purple-500 to-indigo-500'
    },
    // FP / Manager のみ表示
    ...(canAccessFPContent() ? [{
      id: 'bank-account',
      title: '報酬受け取り口座',
      description: '報酬の振込先口座を管理',
      icon: Building2,
      href: '/dashboard/settings/bank-account',
      color: 'from-emerald-500 to-teal-500'
    }] : []),
    {
      id: 'notifications',
      title: '通知設定',
      description: '通知の受信設定を管理',
      icon: Bell,
      href: '/dashboard/settings/notifications',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'security',
      title: 'セキュリティ設定',
      description: 'アカウントのセキュリティ管理',
      icon: Shield,
      href: '/dashboard/settings/security',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'account',
      title: 'アカウント情報・退会申請',
      description: 'アカウントの詳細情報と退会申請',
      icon: UserX,
      href: '/dashboard/settings/account',
      color: 'from-red-500 to-orange-500'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 min-w-0 md:ml-64">
        {/* ヘッダー */}
        <DashboardHeader />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">設定</h1>
              <p className="text-slate-600 mt-1">アカウント設定と通知設定を管理できます</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {settingsItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.id} href={item.href}>
                    <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                        </div>
                        <CardTitle className="mt-4">{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SubscriptionGuard allowAccess={true}>
        <SettingsListPage />
      </SubscriptionGuard>
    </ProtectedRoute>
  )
}
