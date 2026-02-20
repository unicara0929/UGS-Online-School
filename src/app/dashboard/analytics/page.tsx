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
    totalCourseViews: number
    totalEventRegistrations: number
    totalCompletions: number
    avgCompletionRate: number
    uniqueViewers: number
    totalCourses: number
    totalEvents: number
  }
  courseRanking: Array<{
    id: string
    title: string
    category: string
    level: string
    views: number
    completions: number
    learners: number
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
    courseViews: number
    eventViews: number
    lessonViews: number
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

        {/* タブ切り替え */}
        <div className="flex gap-2 border-b border-slate-200 pb-0">
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'payment'
                ? 'bg-white text-blue-600 border border-b-white border-slate-200 -mb-px'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="h-4 w-4 inline-block mr-1.5 -mt-0.5" aria-hidden="true" />
            決済・売上
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'content'
                ? 'bg-white text-blue-600 border border-b-white border-slate-200 -mb-px'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="h-4 w-4 inline-block mr-1.5 -mt-0.5" aria-hidden="true" />
            コンテンツ分析
          </button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div role="alert" className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== 決済・売上タブ ===== */}
        {activeTab === 'payment' && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 有料会員数 */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-700">有料会員数</CardTitle>
                <Users className="h-5 w-5 text-blue-600" aria-hidden="true" />
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
                <DollarSign className="h-5 w-5 text-green-600" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-slate-900 mb-2">{formatCurrency(monthlyRevenue)}</p>
              <p className="text-sm text-slate-500">有料会員数 × 月額¥5,500</p>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
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
                <UserX className="h-5 w-5 text-red-600" aria-hidden="true" />
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
        </>
        )}

        {/* ===== コンテンツ分析タブ ===== */}
        {activeTab === 'content' && (
          <>
            {contentLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-600">コンテンツデータを読み込み中...</p>
              </div>
            ) : contentAnalytics ? (
              <>
                {/* KPIカード */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="shadow-lg border-2 border-violet-100 bg-gradient-to-br from-violet-50 to-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-violet-700 flex items-center">
                        <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                        コース閲覧数
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-violet-600">{contentAnalytics.kpi.totalCourseViews}</div>
                      <p className="text-xs text-violet-500 mt-1">{contentAnalytics.kpi.totalCourses}コース</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-emerald-700 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                        コース修了数
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-emerald-600">{contentAnalytics.kpi.totalCompletions}</div>
                      <p className="text-xs text-emerald-500 mt-1">平均修了率: {contentAnalytics.kpi.avgCompletionRate}%</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-amber-700 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                        イベント参加登録
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-600">{contentAnalytics.kpi.totalEventRegistrations}</div>
                      <p className="text-xs text-amber-500 mt-1">{contentAnalytics.kpi.totalEvents}イベント</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
                        <Users className="h-4 w-4 mr-2" aria-hidden="true" />
                        ユニーク利用者
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">{contentAnalytics.kpi.uniqueViewers}</div>
                      <p className="text-xs text-blue-500 mt-1">コンテンツ閲覧ユーザー</p>
                    </CardContent>
                  </Card>
                </div>

                {/* 月別コンテンツ閲覧トレンド */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
                      コンテンツ閲覧トレンド（過去6ヶ月）
                    </CardTitle>
                    <CardDescription>月別のコンテンツタイプ別閲覧数推移</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={contentAnalytics.monthlyTrends}>
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
                          <Line type="monotone" dataKey="courseViews" name="コース" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="lessonViews" name="レッスン" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="eventViews" name="イベント" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* コース人気ランキング & 修了率 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Trophy className="h-5 w-5 mr-2 text-violet-600" aria-hidden="true" />
                        コース人気ランキング
                      </CardTitle>
                      <CardDescription>閲覧数順</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {contentAnalytics.courseRanking.length > 0 ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={contentAnalytics.courseRanking.slice(0, 8)}
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
                                formatter={(value: number) => [`${value}回`, '閲覧数']}
                              />
                              <Bar dataKey="views" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">閲覧データがまだありません</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-600" aria-hidden="true" />
                        コース修了率
                      </CardTitle>
                      <CardDescription>学習開始者のうち修了した割合</CardDescription>
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
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
                      コース別詳細
                    </CardTitle>
                    <CardDescription>各コースの閲覧数・学習者数・修了率</CardDescription>
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
                              <th className="text-center py-3 px-2 font-medium text-slate-600">閲覧数</th>
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
                                <td className="py-2.5 px-2 text-center font-medium text-violet-600">{course.views}</td>
                                <td className="py-2.5 px-2 text-center text-slate-600">{course.learners}</td>
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
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-amber-600" aria-hidden="true" />
                      イベント参加ランキング
                    </CardTitle>
                    <CardDescription>登録者数順</CardDescription>
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
              <div className="text-center py-12">
                <p className="text-slate-500">コンテンツ分析データの読み込みに失敗しました</p>
                <Button variant="outline" className="mt-4" onClick={fetchContentData}>
                  再読み込み
                </Button>
              </div>
            )}
          </>
        )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
