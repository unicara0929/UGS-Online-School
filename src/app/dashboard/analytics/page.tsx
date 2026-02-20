'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  DollarSign,
  UserX,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Calendar,
  Eye,
  CheckCircle2,
  Trophy,
  BarChart3,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

type TabType = 'payment' | 'content'

interface ContentAnalytics {
  kpi: {
    totalLearners: number
    totalEventRegistrations: number
    totalCompletions: number
    avgCompletionRate: number
    totalCourses: number
    totalEvents: number
  }
  courseRanking: Array<{
    id: string
    title: string
    category: string
    level: string
    learners: number
    completions: number
    lessonCount: number
    completionRate: number
  }>
  eventRanking: Array<{
    id: string
    title: string
    category: string
    status: string
    registrations: number
    date: string | null
  }>
  monthlyTrends: Array<{
    month: string
    activeLearners: number
    eventRegistrations: number
  }>
}

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
  const [activeTab, setActiveTab] = useState<TabType>('payment')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([])
  const [contentAnalytics, setContentAnalytics] = useState<ContentAnalytics | null>(null)
  const [contentLoading, setContentLoading] = useState(false)

  // 統計データ
  const [activeMembers, setActiveMembers] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [canceledMembers, setCanceledMembers] = useState(0)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  useEffect(() => {
    if (activeTab === 'content' && !contentAnalytics) {
      fetchContentData()
    }
  }, [activeTab])

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

  const fetchContentData = async () => {
    try {
      setContentLoading(true)
      const res = await fetch('/api/admin/analytics/content', { credentials: 'include' })
      if (!res.ok) throw new Error('コンテンツ分析データの取得に失敗しました')
      const data = await res.json()
      setContentAnalytics(data)
    } catch (err) {
      console.error('Content analytics fetch error:', err)
    } finally {
      setContentLoading(false)
    }
  }

  const getCourseCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
      MONEY_LITERACY: 'マネーリテラシー',
      PRACTICAL_SKILL: '実践スキル',
      STARTUP_SUPPORT: 'スタートアップ支援',
      STARTUP_GUIDE: 'はじめに',
    }
    return map[category] || category
  }

  const getEventCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
      MTG: '全体MTG',
      REGULAR: '通常イベント',
      TRAINING: '研修',
    }
    return map[category] || category
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
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-sm text-slate-500">データを読み込み中...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['manager', 'admin']}>
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">

        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
              <BarChart3 className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">分析ダッシュボード</h1>
              <p className="text-sm text-slate-500">学習・決済・集客の主要KPI</p>
            </div>
          </div>
        </div>

        {/* タブ切り替え */}
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('payment')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'payment'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="h-4 w-4" aria-hidden="true" />
            決済・売上
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'content'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            コンテンツ分析
          </button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50/80">
            <CardContent className="pt-6">
              <div role="alert" className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== 決済・売上タブ ===== */}
        {activeTab === 'payment' && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 有料会員数 */}
          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400"></div>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-500">有料会員数</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" aria-hidden="true" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-slate-900 tracking-tight">{activeMembers}</p>
              <p className="text-xs text-slate-400 mt-1">アクティブなサブスクリプション</p>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  <span>Stripe連携で自動反映</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 月額売上 */}
          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-500">月額売上</CardTitle>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <DollarSign className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-slate-900 tracking-tight">{formatCurrency(monthlyRevenue)}</p>
              <p className="text-xs text-slate-400 mt-1">有料会員数 × 月額¥5,500</p>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  <span>リアルタイム更新</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 退会（解約）数 */}
          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-400"></div>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-500">退会（解約）数</CardTitle>
                <div className="p-2 bg-red-50 rounded-lg">
                  <UserX className="h-4 w-4 text-red-500" aria-hidden="true" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-slate-900 tracking-tight">{canceledMembers}</p>
              <p className="text-xs text-slate-400 mt-1">キャンセル済みサブスクリプション</p>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">解約・再開で変動</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 追加統計情報 */}
        <Card className="border-0 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">詳細統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">総サブスクリプション数</p>
                <p className="text-3xl font-bold text-slate-900">{subscriptions.length}</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">継続率</p>
                <p className="text-3xl font-bold text-slate-900">
                  {subscriptions.length > 0 && (activeMembers + canceledMembers) > 0
                    ? `${Math.round((activeMembers / (activeMembers + canceledMembers)) * 100)}%`
                    : '--%'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </>
        )}

        {/* ===== コンテンツ分析タブ ===== */}
        {activeTab === 'content' && (
          <>
            {contentLoading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-sm text-slate-500">コンテンツデータを読み込み中...</p>
              </div>
            ) : contentAnalytics ? (
              <>
                {/* KPIカード */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-violet-400"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-500">学習中ユーザー</CardTitle>
                        <div className="p-2 bg-violet-50 rounded-lg">
                          <Users className="h-4 w-4 text-violet-600" aria-hidden="true" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900 tracking-tight">{contentAnalytics.kpi.totalLearners}</div>
                      <p className="text-xs text-slate-400 mt-1">全期間 / {contentAnalytics.kpi.totalCourses}コース</p>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-500">コース修了数</CardTitle>
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900 tracking-tight">{contentAnalytics.kpi.totalCompletions}</div>
                      <p className="text-xs text-slate-400 mt-1">全期間 / 平均修了率: {contentAnalytics.kpi.avgCompletionRate}%</p>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-400"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-500">イベント参加登録</CardTitle>
                        <div className="p-2 bg-amber-50 rounded-lg">
                          <Calendar className="h-4 w-4 text-amber-600" aria-hidden="true" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900 tracking-tight">{contentAnalytics.kpi.totalEventRegistrations}</div>
                      <p className="text-xs text-slate-400 mt-1">全期間 / {contentAnalytics.kpi.totalEvents}イベント</p>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-500">コース数</CardTitle>
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <BookOpen className="h-4 w-4 text-blue-600" aria-hidden="true" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900 tracking-tight">{contentAnalytics.kpi.totalCourses}</div>
                      <p className="text-xs text-slate-400 mt-1">公開中のコース</p>
                    </CardContent>
                  </Card>
                </div>

                {/* 月別コンテンツ閲覧トレンド */}
                <Card className="border-0 shadow-md bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center text-base font-semibold text-slate-900">
                      <TrendingUp className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
                      月別アクティビティ（過去6ヶ月）
                    </CardTitle>
                    <CardDescription>学習アクティブユーザー数とイベント登録数の推移</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={contentAnalytics.monthlyTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="month"
                            tickFormatter={(v) => {
                              const parts = v.split('-')
                              return `${parts[1]}月`
                            }}
                            stroke="#94a3b8"
                            fontSize={12}
                          />
                          <YAxis stroke="#94a3b8" fontSize={12} />
                          <Tooltip
                            labelFormatter={(v) => {
                              const parts = String(v).split('-')
                              return `${parts[0]}年${parts[1]}月`
                            }}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          />
                          <Legend />
                          <Bar dataKey="activeLearners" name="学習ユーザー" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="eventRegistrations" name="イベント登録" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* コース人気ランキング & 修了率 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="border-0 shadow-md bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center text-base font-semibold text-slate-900">
                        <Trophy className="h-5 w-5 mr-2 text-violet-600" aria-hidden="true" />
                        コース人気ランキング
                      </CardTitle>
                      <CardDescription>学習者数順（全期間）</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {contentAnalytics.courseRanking.filter(c => c.learners > 0).length > 0 ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={contentAnalytics.courseRanking.filter(c => c.learners > 0).slice(0, 8)}
                              layout="vertical"
                              margin={{ left: 0, right: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                              <YAxis
                                type="category"
                                dataKey="title"
                                width={140}
                                stroke="#94a3b8"
                                fontSize={11}
                                tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + '...' : v}
                              />
                              <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                formatter={(value: number) => [`${value}人`, '学習者数']}
                              />
                              <Bar dataKey="learners" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">学習データがまだありません</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center text-base font-semibold text-slate-900">
                        <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-600" aria-hidden="true" />
                        コース修了率
                      </CardTitle>
                      <CardDescription>学習開始者のうち修了した割合（全期間）</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {contentAnalytics.courseRanking.filter(c => c.learners > 0).length > 0 ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={contentAnalytics.courseRanking.filter(c => c.learners > 0).slice(0, 8)}
                              layout="vertical"
                              margin={{ left: 0, right: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={12} unit="%" />
                              <YAxis
                                type="category"
                                dataKey="title"
                                width={140}
                                stroke="#94a3b8"
                                fontSize={11}
                                tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + '...' : v}
                              />
                              <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                formatter={(value: number) => [`${value}%`, '修了率']}
                              />
                              <Bar dataKey="completionRate" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">修了データがまだありません</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* コース詳細テーブル */}
                <Card className="border-0 shadow-md bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center text-base font-semibold text-slate-900">
                      <BookOpen className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
                      コース別詳細
                    </CardTitle>
                    <CardDescription>各コースの学習者数・修了率（全期間）</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {contentAnalytics.courseRanking.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-3 px-2 font-medium text-slate-600">コース名</th>
                              <th className="text-center py-3 px-2 font-medium text-slate-600">カテゴリ</th>
                              <th className="text-center py-3 px-2 font-medium text-slate-600">レッスン数</th>
                              <th className="text-center py-3 px-2 font-medium text-slate-600">学習者</th>
                              <th className="text-center py-3 px-2 font-medium text-slate-600">修了数</th>
                              <th className="text-center py-3 px-2 font-medium text-slate-600">修了率</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contentAnalytics.courseRanking.map((course, index) => (
                              <tr key={course.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-2.5 px-2">
                                  <div className="flex items-center gap-2">
                                    {index < 3 && (
                                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                        index === 1 ? 'bg-slate-100 text-slate-600' :
                                        'bg-orange-100 text-orange-700'
                                      }`}>
                                        {index + 1}
                                      </span>
                                    )}
                                    <span className="font-medium text-slate-900">{course.title}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <Badge variant="outline" className="text-xs">{getCourseCategoryLabel(course.category)}</Badge>
                                </td>
                                <td className="py-2.5 px-2 text-center text-slate-600">{course.lessonCount}</td>
                                <td className="py-2.5 px-2 text-center font-medium text-violet-600">{course.learners}</td>
                                <td className="py-2.5 px-2 text-center text-emerald-600">{course.completions}</td>
                                <td className="py-2.5 px-2 text-center">
                                  <span className={`font-medium ${
                                    course.completionRate >= 70 ? 'text-emerald-600' :
                                    course.completionRate >= 40 ? 'text-amber-600' :
                                    'text-slate-500'
                                  }`}>
                                    {course.learners > 0 ? `${course.completionRate}%` : '-'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-8">コースデータがありません</p>
                    )}
                  </CardContent>
                </Card>

                {/* イベント参加ランキング */}
                <Card className="border-0 shadow-md bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center text-base font-semibold text-slate-900">
                      <Calendar className="h-5 w-5 mr-2 text-amber-600" aria-hidden="true" />
                      イベント参加ランキング
                    </CardTitle>
                    <CardDescription>登録者数順（全期間）</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {contentAnalytics.eventRanking.length > 0 ? (
                      <div className="space-y-2">
                        {contentAnalytics.eventRanking.slice(0, 15).map((event, index) => (
                          <div key={event.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              {index < 3 && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                  index === 1 ? 'bg-slate-100 text-slate-600' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {index + 1}
                                </span>
                              )}
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 truncate">{event.title}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className="text-xs">{getEventCategoryLabel(event.category)}</Badge>
                                  {event.date && (
                                    <span className="text-xs text-slate-500">
                                      {new Date(event.date).toLocaleDateString('ja-JP')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                {event.registrations}名
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-8">イベントデータがありません</p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-sm text-slate-500">コンテンツ分析データの読み込みに失敗しました</p>
                <Button variant="outline" className="mt-4" onClick={fetchContentData}>
                  再読み込み
                </Button>
              </div>
            )}
          </>
        )}
        </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
