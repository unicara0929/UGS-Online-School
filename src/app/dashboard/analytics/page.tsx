'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, UserX, TrendingUp, AlertCircle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface SubscriptionInfo {
  id: string
  userId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: string
  currentPeriodEnd: string | null
  stripeDetails: {
    status: string
    currentPeriodEnd: string
    currentPeriodStart: string
    cancelAtPeriodEnd: boolean
    canceledAt: string | null
    amount: number
    currency: string
  } | null
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([])
  
  // 統計データ
  const [activeMembers, setActiveMembers] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [canceledMembers, setCanceledMembers] = useState(0)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/subscriptions', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('サブスクリプション情報の取得に失敗しました')
      }
      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
      calculateStats(data.subscriptions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (subs: SubscriptionInfo[]) => {
    // アクティブな有料会員数（status = 'active' かつ cancelAtPeriodEnd = false）
    const active = subs.filter(sub => 
      sub.stripeDetails?.status === 'active' && !sub.stripeDetails.cancelAtPeriodEnd
    ).length
    setActiveMembers(active)

    // 月額売上（アクティブ会員数 × 月額料金 ¥5,500）
    const monthlyAmount = active * 5500
    setMonthlyRevenue(monthlyAmount)

    // 退会（解約）数（status = 'canceled' または cancelAtPeriodEnd = true）
    const canceled = subs.filter(sub => 
      sub.stripeDetails?.status === 'canceled' || 
      sub.stripeDetails?.cancelAtPeriodEnd === true
    ).length
    setCanceledMembers(canceled)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount)
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['manager', 'admin']}>
        <DashboardLayout>
          <div className="p-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-600">データを読み込み中...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['manager', 'admin']}>
      <DashboardLayout>
        <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">分析</h1>
          <p className="text-slate-600 mt-1">学習・決済・集客の主要KPI</p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 有料会員数 */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-700">有料会員数</CardTitle>
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-slate-900 mb-2">{activeMembers}</p>
              <p className="text-sm text-slate-500">アクティブなサブスクリプション</p>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-600">Stripe連携で自動反映</p>
              </div>
            </CardContent>
          </Card>

          {/* 月額売上 */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-700">月額売上</CardTitle>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-slate-900 mb-2">{formatCurrency(monthlyRevenue)}</p>
              <p className="text-sm text-slate-500">有料会員数 × 月額¥5,500</p>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>リアルタイム更新</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 退会（解約）数 */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-700">退会（解約）数</CardTitle>
                <UserX className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-slate-900 mb-2">{canceledMembers}</p>
              <p className="text-sm text-slate-500">キャンセル済みサブスクリプション</p>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-600">解約・再開で変動</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 追加統計情報 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>詳細統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">総サブスクリプション数</p>
                <p className="text-2xl font-bold text-slate-900">{subscriptions.length}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">継続率</p>
                <p className="text-2xl font-bold text-slate-900">
                  {subscriptions.length > 0 && (activeMembers + canceledMembers) > 0
                    ? `${Math.round((activeMembers / (activeMembers + canceledMembers)) * 100)}%`
                    : '--%'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
