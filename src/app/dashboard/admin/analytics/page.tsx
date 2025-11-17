'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  UserCheck,
  UserX,
  AlertCircle,
  PauseCircle,
  BarChart3
} from 'lucide-react'

interface Analytics {
  overview: {
    totalUsers: number
    activeUsers: number
    suspendedUsers: number
    pastDueUsers: number
    delinquentUsers: number
    activeRate: string
    churnRateLast30Days: string
  }
  statusBreakdown: Array<{
    status: string
    count: number
    percentage: string
  }>
  roleBreakdown: Array<{
    role: string
    count: number
    percentage: string
  }>
  recentActivity: {
    newUsersLast30Days: number
    canceledLast30Days: number
    statusChangesLast30Days: number
  }
  monthlyTrends: Array<{
    month: string
    newUsers: number
    canceledUsers: number
    netGrowth: number
  }>
  cancellationReasons: Array<{
    reason: string
    count: number
  }>
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/analytics/membership', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('分析データの取得に失敗しました')
      }
      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const getMembershipStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: '仮登録',
      ACTIVE: '有効会員',
      SUSPENDED: '休会中',
      PAST_DUE: '支払い遅延',
      DELINQUENT: '長期滞納',
      CANCELED: '退会済み',
      TERMINATED: '強制解約',
      EXPIRED: '期限切れ',
    }
    return statusMap[status] || status
  }

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      MEMBER: 'メンバー',
      FP: 'FPエイド',
      MANAGER: 'マネージャー',
      ADMIN: '管理者',
      PENDING: '仮登録',
    }
    return roleMap[role] || role
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'データの取得に失敗しました'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
            会員管理分析ダッシュボード
          </h1>
          <p className="text-slate-600 mt-2">会員ステータスと統計情報の概要</p>
        </div>

        {/* 概要カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                総会員数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{analytics.overview.totalUsers}</div>
              <p className="text-xs text-slate-500 mt-1">全ユーザー</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
                <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                有効会員数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{analytics.overview.activeUsers}</div>
              <p className="text-xs text-slate-500 mt-1">有効率: {analytics.overview.activeRate}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                新規登録（30日）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{analytics.recentActivity.newUsersLast30Days}</div>
              <p className="text-xs text-slate-500 mt-1">過去30日間</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
                <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
                退会率（30日）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{analytics.overview.churnRateLast30Days}%</div>
              <p className="text-xs text-slate-500 mt-1">{analytics.recentActivity.canceledLast30Days}名が退会</p>
            </CardContent>
          </Card>
        </div>

        {/* アラートカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-800 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                支払い遅延
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{analytics.overview.pastDueUsers}</div>
              <p className="text-xs text-orange-700 mt-1">要フォローアップ</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800 flex items-center">
                <UserX className="h-4 w-4 mr-2" />
                長期滞納
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{analytics.overview.delinquentUsers}</div>
              <p className="text-xs text-red-700 mt-1">緊急対応必要</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center">
                <PauseCircle className="h-4 w-4 mr-2" />
                休会中
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{analytics.overview.suspendedUsers}</div>
              <p className="text-xs text-blue-700 mt-1">一時停止中</p>
            </CardContent>
          </Card>
        </div>

        {/* ステータス内訳 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>会員ステータス内訳</CardTitle>
              <CardDescription>ステータス別のユーザー分布</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.statusBreakdown.map((item) => (
                  <div key={item.status} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium text-slate-900">{getMembershipStatusLabel(item.status)}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{item.count}名</Badge>
                      <span className="text-sm text-slate-600 w-16 text-right">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ロール別内訳</CardTitle>
              <CardDescription>ユーザーロールの分布</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.roleBreakdown.map((item) => (
                  <div key={item.role} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium text-slate-900">{getRoleLabel(item.role)}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{item.count}名</Badge>
                      <span className="text-sm text-slate-600 w-16 text-right">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 月次トレンド */}
        <Card>
          <CardHeader>
            <CardTitle>月次トレンド（過去12ヶ月）</CardTitle>
            <CardDescription>新規登録・退会・純増減の推移</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.monthlyTrends.map((item) => (
                <div key={item.month} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium text-slate-900 w-24">{item.month}</div>
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-slate-600">新規: {item.newUsers}名</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-slate-600">退会: {item.canceledUsers}名</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span className={`text-sm font-medium ${item.netGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        純増: {item.netGrowth >= 0 ? '+' : ''}{item.netGrowth}名
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 退会理由 */}
        {analytics.cancellationReasons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>退会理由</CardTitle>
              <CardDescription>ユーザーが記入した退会理由の集計</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.cancellationReasons.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="font-medium text-slate-900">{item.reason}</div>
                    <Badge variant="outline">{item.count}件</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
