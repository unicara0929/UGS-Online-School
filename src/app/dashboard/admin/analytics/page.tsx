'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  UserCheck,
  UserX,
  AlertCircle,
  BarChart3,
  ArrowRight,
  Award,
  ChevronRight,
  Star,
  BookOpen,
  Calendar,
  Eye,
  CheckCircle2,
  Trophy
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

type TabType = 'membership' | 'content'

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

interface Analytics {
  overview: {
    totalUsers: number
    activeUsers: number
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

interface RoleStats {
  overview: {
    memberCount: number
    fpCount: number
    managerCount: number
    totalPromotions: number
    thisMonthPromotions: number
    lastMonthPromotions: number
  }
  monthlyPromotions: Array<{
    month: string
    year: number
    monthNumber: number
    promotions: number
  }>
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('membership')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [roleStats, setRoleStats] = useState<RoleStats | null>(null)
  const [contentAnalytics, setContentAnalytics] = useState<ContentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  // コンテンツ分析タブに切り替え時にデータ取得
  useEffect(() => {
    if (activeTab === 'content' && !contentAnalytics) {
      fetchContentData()
    }
  }, [activeTab])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [analyticsRes, roleStatsRes] = await Promise.all([
        fetch('/api/admin/analytics/membership', { credentials: 'include' }),
        fetch('/api/admin/analytics/role-stats', { credentials: 'include' })
      ])

      if (!analyticsRes.ok || !roleStatsRes.ok) {
        throw new Error('分析データの取得に失敗しました')
      }

      const [analyticsData, roleStatsData] = await Promise.all([
        analyticsRes.json(),
        roleStatsRes.json()
      ])

      setAnalytics(analyticsData)
      setRoleStats(roleStatsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
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

  const getMembershipStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: '仮登録',
      ACTIVE: '有効会員',
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
      MEMBER: 'UGS会員',
      FP: 'FPエイド',
      MANAGER: 'マネージャー',
      ADMIN: '管理者',
      PENDING: '仮登録',
    }
    return roleMap[role] || role
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

  // 月別昇格グラフの最大値を計算
  const maxPromotions = roleStats?.monthlyPromotions
    ? Math.max(...roleStats.monthlyPromotions.map(m => m.promotions), 1)
    : 1

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

  if (error || !analytics || !roleStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p role="alert" className="text-red-600">{error || 'データの取得に失敗しました'}</p>
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
            <BarChart3 className="h-8 w-8 mr-3 text-blue-600" aria-hidden="true" />
            分析ダッシュボード
          </h1>
          <p className="text-slate-600 mt-2">会員管理・コンテンツ分析</p>
        </div>

        {/* タブ切り替え */}
        <div className="flex gap-2 border-b border-slate-200 pb-0">
          <button
            onClick={() => setActiveTab('membership')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'membership'
                ? 'bg-white text-blue-600 border border-b-white border-slate-200 -mb-px'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Users className="h-4 w-4 inline-block mr-1.5 -mt-0.5" aria-hidden="true" />
            会員管理
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

        {/* ===== 会員管理タブ ===== */}
        {activeTab === 'membership' && (<>

        {/* メイン統計カード（UGS会員・FPエイド・昇格人数） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* UGS会員数 */}
          <Card className="relative overflow-hidden border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-lg font-semibold text-blue-800 flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Users className="h-6 w-6 text-blue-600" aria-hidden="true" />
                </div>
                UGS会員
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-5xl font-bold text-blue-600 mb-2">
                {roleStats.overview.memberCount}
                <span className="text-2xl font-normal text-blue-400 ml-1">人</span>
              </div>
              <p className="text-sm text-blue-600/70">有効な会員数</p>
            </CardContent>
          </Card>

          {/* FPエイド数 */}
          <Card className="relative overflow-hidden border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-lg font-semibold text-emerald-800 flex items-center">
                <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                  <Star className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                </div>
                FPエイド
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-5xl font-bold text-emerald-600 mb-2">
                {roleStats.overview.fpCount}
                <span className="text-2xl font-normal text-emerald-400 ml-1">人</span>
              </div>
              <p className="text-sm text-emerald-600/70">有効なFPエイド数</p>
            </CardContent>
          </Card>

          {/* 昇格人数 */}
          <Card className="relative overflow-hidden border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-lg font-semibold text-amber-800 flex items-center">
                <div className="p-2 bg-amber-100 rounded-lg mr-3">
                  <Award className="h-6 w-6 text-amber-600" aria-hidden="true" />
                </div>
                FPエイド昇格
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-5xl font-bold text-amber-600 mb-2">
                {roleStats.overview.totalPromotions}
                <span className="text-2xl font-normal text-amber-400 ml-1">人</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-amber-600/70">累計</span>
                {roleStats.overview.thisMonthPromotions > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                    今月 +{roleStats.overview.thisMonthPromotions}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 昇格フロー図 */}
        <Card className="border-2 border-indigo-100">
          <CardHeader>
            <CardTitle className="flex items-center text-indigo-900">
              <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" aria-hidden="true" />
              キャリアパス・昇格フロー
            </CardTitle>
            <CardDescription>UGS会員からFPエイド、マネージャーへのキャリアステップ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 py-6">
              {/* UGS会員 */}
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Users className="h-10 w-10 mb-2" aria-hidden="true" />
                  <span className="font-bold text-lg">UGS会員</span>
                  <span className="text-2xl font-bold">{roleStats.overview.memberCount}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">スタート地点</p>
              </div>

              {/* 矢印 */}
              <div className="flex flex-col items-center px-4">
                <div className="hidden md:flex items-center">
                  <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-emerald-400"></div>
                  <ChevronRight className="h-8 w-8 text-emerald-500 -ml-2" aria-hidden="true" />
                </div>
                <div className="md:hidden h-8 w-1 bg-gradient-to-b from-blue-400 to-emerald-400"></div>
                <div className="bg-amber-100 px-3 py-1 rounded-full text-amber-700 text-sm font-medium mt-2">
                  {roleStats.overview.totalPromotions}人が昇格
                </div>
              </div>

              {/* FPエイド */}
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex flex-col items-center justify-center text-white shadow-lg shadow-emerald-200">
                  <Star className="h-10 w-10 mb-2" aria-hidden="true" />
                  <span className="font-bold text-lg">FPエイド</span>
                  <span className="text-2xl font-bold">{roleStats.overview.fpCount}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">活躍中</p>
              </div>

              {/* 矢印 */}
              <div className="flex flex-col items-center px-4">
                <div className="hidden md:flex items-center">
                  <div className="w-16 h-1 bg-gradient-to-r from-emerald-400 to-purple-400"></div>
                  <ChevronRight className="h-8 w-8 text-purple-500 -ml-2" aria-hidden="true" />
                </div>
                <div className="md:hidden h-8 w-1 bg-gradient-to-b from-emerald-400 to-purple-400"></div>
              </div>

              {/* マネージャー */}
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex flex-col items-center justify-center text-white shadow-lg shadow-purple-200">
                  <Award className="h-10 w-10 mb-2" aria-hidden="true" />
                  <span className="font-bold text-lg">マネージャー</span>
                  <span className="text-2xl font-bold">{roleStats.overview.managerCount}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">リーダー</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 月別昇格推移グラフ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-amber-600" aria-hidden="true" />
              FPエイド昇格推移（過去12ヶ月）
            </CardTitle>
            <CardDescription>月別のUGS会員→FPエイド昇格人数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-48 pt-4">
              {roleStats.monthlyPromotions.map((item, index) => {
                const height = item.promotions > 0
                  ? Math.max((item.promotions / maxPromotions) * 100, 10)
                  : 5
                const isCurrentMonth = index === roleStats.monthlyPromotions.length - 1

                return (
                  <div key={item.month} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-full max-w-12 rounded-t-lg transition-[height] duration-300 ${
                        isCurrentMonth
                          ? 'bg-gradient-to-t from-amber-500 to-amber-400'
                          : item.promotions > 0
                            ? 'bg-gradient-to-t from-amber-300 to-amber-200'
                            : 'bg-slate-200'
                      }`}
                      style={{ height: `${height}%` }}
                    >
                      {item.promotions > 0 && (
                        <div className="text-center text-xs font-bold text-white pt-1">
                          {item.promotions}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs mt-2 ${isCurrentMonth ? 'font-bold text-amber-600' : 'text-slate-500'}`}>
                      {item.monthNumber}月
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                <span className="font-medium">今月:</span> {roleStats.overview.thisMonthPromotions}人
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-medium">前月:</span> {roleStats.overview.lastMonthPromotions}人
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-medium">累計:</span> {roleStats.overview.totalPromotions}人
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 概要カード（既存） */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
                <Users className="h-4 w-4 mr-2" aria-hidden="true" />
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
                <UserCheck className="h-4 w-4 mr-2 text-green-600" aria-hidden="true" />
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
                <TrendingUp className="h-4 w-4 mr-2 text-blue-600" aria-hidden="true" />
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
                <TrendingDown className="h-4 w-4 mr-2 text-red-600" aria-hidden="true" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-800 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" aria-hidden="true" />
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
                <UserX className="h-4 w-4 mr-2" aria-hidden="true" />
                長期滞納
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{analytics.overview.delinquentUsers}</div>
              <p className="text-xs text-red-700 mt-1">緊急対応必要</p>
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
                      <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
                      <span className="text-sm text-slate-600">新規: {item.newUsers}名</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />
                      <span className="text-sm text-slate-600">退会: {item.canceledUsers}名</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-blue-600" aria-hidden="true" />
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

        </>)}

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
                  <Card className="border-2 border-violet-100 bg-gradient-to-br from-violet-50 to-white">
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

                  <Card className="border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
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

                  <Card className="border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white">
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

                  <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
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
                <Card>
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
                  {/* コース人気ランキング（閲覧数） */}
                  <Card>
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

                  {/* コース修了率 */}
                  <Card>
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
                <Card>
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
                <Card>
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
    </div>
  )
}
