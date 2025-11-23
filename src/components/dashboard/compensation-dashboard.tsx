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

  // 昇格条件のモックデータ（これは別のAPIで取得するべき）
  const promotionConditions = {
    compensationAverage: {
      current: stats?.recentAverage || 0,
      target: 70000,
      progress: stats?.recentAverage ? Math.min(100, Math.round((stats.recentAverage / 70000) * 100)) : 0
    },
    memberReferrals: {
      current: 6,
      target: 8,
      progress: 75
    },
    fpReferrals: {
      current: 2,
      target: 4,
      progress: 50
    },
    contractAchieved: false
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (userRole === 'member') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            報酬管理
          </CardTitle>
          <CardDescription>
            FPエイド昇格後に報酬管理機能が利用可能になります
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">FPエイドに昇格すると報酬管理機能が利用できます</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 報酬サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の報酬</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.currentMonth?.amount || 0)}
            </div>
            {stats?.trend !== undefined && stats.trend !== 0 && (
              <p className={`text-xs flex items-center ${stats.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats.trend > 0 ? '+' : ''}{stats.trend}% 前月比
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">先月の報酬</CardTitle>
            <Calendar className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.lastMonth?.amount || 0)}
            </div>
            <p className="text-xs text-slate-600">
              {stats?.lastMonth?.status === 'PAID' ? '支払済み' : stats?.lastMonth?.status === 'CONFIRMED' ? '確定済み' : '未確定'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累計報酬</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.total || 0)}</div>
            <p className="text-xs text-slate-600">生涯報酬合計</p>
          </CardContent>
        </Card>
      </div>

      {/* ロール別合計 */}
      {stats?.totalByRole && (stats.totalByRole.FP > 0 || stats.totalByRole.MANAGER > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ロール別累計報酬</CardTitle>
            <CardDescription>FPエイド時代とマネージャー時代の報酬内訳</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">FPエイド時代</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(stats.totalByRole.FP)}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">マネージャー時代</p>
                <p className="text-xl font-bold text-purple-900">{formatCurrency(stats.totalByRole.MANAGER)}</p>
              </div>
              <div className="p-4 bg-slate-100 rounded-lg">
                <p className="text-sm text-slate-600 font-medium">生涯報酬合計</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* フィルタ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            フィルタ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* ロール別フィルター */}
            <div>
              <label className="text-sm font-medium mb-2 block">ロール別</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={roleFilter === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('ALL')}
                >
                  すべて
                </Button>
                <Button
                  variant={roleFilter === 'FP' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('FP')}
                  className={roleFilter === 'FP' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  FPエイド時代
                </Button>
                <Button
                  variant={roleFilter === 'MANAGER' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('MANAGER')}
                  className={roleFilter === 'MANAGER' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  マネージャー時代
                </Button>
              </div>
            </div>
            {/* 月別フィルター */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">対象月</label>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              {(monthFilter || roleFilter !== 'ALL') && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMonthFilter('')
                      setRoleFilter('ALL')
                    }}
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
          <CardHeader>
            <CardTitle>報酬履歴</CardTitle>
            <CardDescription>
              月別の報酬サマリー
              {roleFilter !== 'ALL' && (
                <span className="ml-2 text-slate-500">
                  （{roleFilter === 'FP' ? 'FPエイド' : 'マネージャー'}時代のみ表示中）
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCompensations.length > 0 ? (
              <div className="space-y-4">
                {filteredCompensations.map((compensation) => (
                  <div
                    key={compensation.id}
                    className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-slate-600" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{compensation.month}</p>
                            <Badge
                              className={
                                compensation.earnedAsRole === 'FP'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }
                            >
                              {compensation.earnedAsRole === 'FP' ? 'FPエイド' : 'マネージャー'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">契約件数: {compensation.contractCount}件</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">{formatCurrency(compensation.amount)}</p>
                        <Badge className="bg-green-100 text-green-800">
                          支払済み
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600">会員紹介</p>
                        <p className="font-medium">{formatCurrency(compensation.breakdown.memberReferral)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">FP紹介</p>
                        <p className="font-medium">{formatCurrency(compensation.breakdown.fpReferral)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">契約報酬</p>
                        <p className="font-medium">{formatCurrency(compensation.breakdown.contract)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">ボーナス</p>
                        <p className="font-medium">{formatCurrency(compensation.breakdown.bonus)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-600">該当する報酬データがありません</p>
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
              <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">まだ報酬データがありません</p>
              <p className="text-sm text-slate-500 mt-2">紹介や契約実績に応じて報酬が生成されます</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* マネージャー昇格条件 */}
      {userRole === 'fp' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              マネージャー昇格条件
            </CardTitle>
            <CardDescription>
              昇格に必要な条件の進捗状況
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">報酬実績（直近6ヶ月平均）</span>
                  <span className="text-sm">{formatCurrency(promotionConditions.compensationAverage.current)} / {formatCurrency(promotionConditions.compensationAverage.target)}</span>
                </div>
                <Progress value={promotionConditions.compensationAverage.progress} className="h-2" />
                <Badge variant={promotionConditions.compensationAverage.progress >= 100 ? "success" : "secondary"} className="mt-1">
                  {promotionConditions.compensationAverage.progress >= 100 ? "達成" : "未達成"}
                </Badge>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">UGS会員紹介（6ヶ月間）</span>
                  <span className="text-sm">{promotionConditions.memberReferrals.current} / {promotionConditions.memberReferrals.target}名</span>
                </div>
                <Progress value={promotionConditions.memberReferrals.progress} className="h-2" />
                <Badge variant={promotionConditions.memberReferrals.progress >= 100 ? "success" : "secondary"} className="mt-1">
                  {promotionConditions.memberReferrals.progress >= 100 ? "達成" : "未達成"}
                </Badge>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">FPエイド紹介（6ヶ月間）</span>
                  <span className="text-sm">{promotionConditions.fpReferrals.current} / {promotionConditions.fpReferrals.target}名</span>
                </div>
                <Progress value={promotionConditions.fpReferrals.progress} className="h-2" />
                <Badge variant={promotionConditions.fpReferrals.progress >= 100 ? "success" : "secondary"} className="mt-1">
                  {promotionConditions.fpReferrals.progress >= 100 ? "達成" : "未達成"}
                </Badge>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">契約実績（直20被保）</span>
                  <Badge variant={promotionConditions.contractAchieved ? "success" : "secondary"}>
                    {promotionConditions.contractAchieved ? "達成" : "未達成"}
                  </Badge>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  className="w-full" 
                  disabled={!(
                    promotionConditions.compensationAverage.progress >= 100 &&
                    promotionConditions.memberReferrals.progress >= 100 &&
                    promotionConditions.fpReferrals.progress >= 100 &&
                    promotionConditions.contractAchieved
                  )}
                >
                  面接申請
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
