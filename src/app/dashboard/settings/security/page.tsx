'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"

function SecuritySettingsPage() {
  const handlePasswordChange = () => {
    // 実際の実装では、パスワード変更フォームを表示
    alert('パスワード変更機能は準備中です')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        {/* ヘッダー */}
        <DashboardHeader />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/settings">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">セキュリティ設定</h1>
                <p className="text-slate-600 mt-1">アカウントのセキュリティ管理</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  セキュリティ設定
                </CardTitle>
                <CardDescription>
                  アカウントのセキュリティ管理
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">パスワード変更</h4>
                    <p className="text-sm text-slate-600">アカウントのパスワードを変更</p>
                  </div>
                  <Button variant="outline" onClick={handlePasswordChange}>
                    変更
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">2段階認証</h4>
                    <p className="text-sm text-slate-600">セキュリティを強化</p>
                  </div>
                  <Badge variant="outline">準備中</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function SecuritySettingsPageComponent() {
  return (
    <ProtectedRoute>
      <SecuritySettingsPage />
    </ProtectedRoute>
  )
}

