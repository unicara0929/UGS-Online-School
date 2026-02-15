'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import {
  DollarSign,
  TrendingUp,
  Download,
  Eye,
  Calendar,
  Users,
  FileText,
  Loader2,
  Filter
} from "lucide-react"

interface CompensationDashboardProps {
  userRole: string
}

interface Compensation {
  id: string
  userId: string
  month: string
  amount: number
  contractCount: number
  breakdown: {
    memberReferral: number
    fpReferral: number
    contract: number
    bonus: number
    deduction: number
  }
  earnedAsRole: 'FP' | 'MANAGER'
  status: 'PENDING' | 'CONFIRMED' | 'PAID'
  createdAt: string
}

interface CompensationStats {
  currentMonth: Compensation | null
  lastMonth: Compensation | null
  total: number
  totalByRole: {
    FP: number
    MANAGER: number
  }
  recentAverage: number
  trend: number
}

type RoleFilter = 'ALL' | 'FP' | 'MANAGER'

export function CompensationDashboard({ userRole }: CompensationDashboardProps) {
  const [compensations, setCompensations] = useState<Compensation[]>([])
  const [stats, setStats] = useState<CompensationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<string>('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')

  // フィルタリングされた報酬一覧
  const filteredCompensations = compensations.filter((c) => {
    if (roleFilter === 'ALL') return true
    return c.earnedAsRole === roleFilter
  })

  useEffect(() => {
    if (userRole !== 'member') {
      fetchCompensations()
    } else {
      setIsLoading(false)
    }
  }, [userRole, monthFilter])

  const fetchCompensations = async () => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams()
      if (monthFilter) {
        params.append('month', monthFilter)
      }

      const queryString = params.toString()
      const url = `/api/compensations${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '報酬情報の取得に失敗しました')
      }

      setCompensations(data.compensations)
      setStats(data.stats)
    } catch (err) {
      console.error('Failed to fetch compensations:', err)
      setError(err instanceof Error ? err.message : '報酬情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" aria-hidden="true" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p role="alert" className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // UGS会員には報酬管理セクションを表示しない
  if (userRole === 'member') {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 報酬サマリー */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">今月の報酬</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-600" aria-hidden="true" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold tabular-nums">
              {formatCurrency(stats?.currentMonth?.amount || 0)}
            </div>
            {stats?.trend !== undefined && stats.trend !== 0 && (
              <p className={`text-xs flex items-center tabular-nums ${stats.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
                {stats.trend > 0 ? '+' : ''}{stats.trend}% 前月比
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">先月の報酬</CardTitle>
            <Calendar className="h-4 w-4 text-slate-600" aria-hidden="true" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold tabular-nums">
              {formatCurrency(stats?.lastMonth?.amount || 0)}
            </div>
            <p className="text-xs text-slate-600">
              {stats?.lastMonth?.status === 'PAID' ? '支払済み' : stats?.lastMonth?.status === 'CONFIRMED' ? '確定済み' : '未確定'}
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">累計報酬</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" aria-hidden="true" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold tabular-nums">{formatCurrency(stats?.total || 0)}</div>
            <p className="text-xs text-slate-600">累計受取報酬</p>
          </CardContent>
        </Card>
      </div>

      {/* ロール別合計 */}
      {stats?.totalByRole && (stats.totalByRole.FP > 0 || stats.totalByRole.MANAGER > 0) && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">ロール別累計報酬</CardTitle>
            <CardDescription className="text-xs sm:text-sm">FPエイド期間とMGR期間の報酬内訳</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">FPエイド期間</p>
                <p className="text-lg sm:text-xl font-bold text-blue-900 tabular-nums">{formatCurrency(stats.totalByRole.FP)}</p>
              </div>
              <div className="p-3 sm:p-4 bg-purple-50 rounded-lg">
                <p className="text-xs sm:text-sm text-purple-600 font-medium">MGR期間</p>
                <p className="text-lg sm:text-xl font-bold text-purple-900 tabular-nums">{formatCurrency(stats.totalByRole.MANAGER)}</p>
              </div>
              <div className="p-3 sm:p-4 bg-slate-100 rounded-lg">
                <p className="text-xs sm:text-sm text-slate-600 font-medium">累計受取報酬</p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(stats.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* フィルタ */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            フィルタ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* ロール別フィルター */}
            <div>
              <label className="text-xs sm:text-sm font-medium mb-2 block">ロール別</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={roleFilter === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('ALL')}
                  className="text-xs sm:text-sm"
                >
                  すべて
                </Button>
                <Button
                  variant={roleFilter === 'FP' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('FP')}
                  className={`text-xs sm:text-sm ${roleFilter === 'FP' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                >
                  FPエイド期間
                </Button>
                <Button
                  variant={roleFilter === 'MANAGER' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('MANAGER')}
                  className={`text-xs sm:text-sm ${roleFilter === 'MANAGER' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                >
                  MGR期間
                </Button>
              </div>
            </div>
            {/* 月別フィルター */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <label className="text-xs sm:text-sm font-medium mb-2 block">対象月</label>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              {(monthFilter || roleFilter !== 'ALL') && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMonthFilter('')
                      setRoleFilter('ALL')
                    }}
                    className="text-xs sm:text-sm"
                  >
                    フィルタをクリア
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 報酬一覧 */}
      {compensations.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">報酬履歴</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              月別の報酬サマリー
              {roleFilter !== 'ALL' && (
                <span className="ml-2 text-slate-500">
                  （{roleFilter === 'FP' ? 'FPエイド' : 'マネージャー'}時代のみ表示中）
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {filteredCompensations.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {filteredCompensations.map((compensation) => (
                  <div
                    key={compensation.id}
                    className="p-3 sm:p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-900 text-sm sm:text-base">{compensation.month}</p>
                            <Badge
                              className={`text-xs ${
                                compensation.earnedAsRole === 'FP'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {compensation.earnedAsRole === 'FP' ? 'FPエイド' : 'マネージャー'}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 tabular-nums">契約件数: {compensation.contractCount}件</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                        <p className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(compensation.amount)}</p>
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          支払済み
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-slate-600">会員紹介</p>
                        <p className="font-medium tabular-nums">{formatCurrency(compensation.breakdown.memberReferral)}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-slate-600">FP紹介</p>
                        <p className="font-medium tabular-nums">{formatCurrency(compensation.breakdown.fpReferral)}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-slate-600">契約報酬</p>
                        <p className="font-medium tabular-nums">{formatCurrency(compensation.breakdown.contract)}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-slate-600">ボーナス</p>
                        <p className="font-medium tabular-nums">{formatCurrency(compensation.breakdown.bonus)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <p className="text-slate-600 text-sm">該当する報酬データがありません</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* データがない場合の表示 */}
      {!stats?.currentMonth && compensations.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" aria-hidden="true" />
              <p className="text-slate-600">まだ報酬データがありません</p>
              <p className="text-sm text-slate-500 mt-2">紹介や契約実績に応じて報酬が生成されます</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* マネージャー昇格条件 - FPDashboardに統合したため削除 */}
    </div>
  )
}
