'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Loader2,
  TrendingUp,
  Users,
  Calendar,
  Award,
  Shield,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

interface ManagerDashboardData {
  range: {
    id: string
    rangeNumber: number
    name: string
    maintainSales: number
  } | null
  promotedAt: string | null
  currentPeriod: {
    label: string
    totalSales: number
    totalInsuredCount: number
    maintainThreshold: number
    progressPercent: number
    monthlyData: { month: string; salesAmount: number; insuredCount: number }[]
  }
  exemption: {
    isExempt: boolean
    exemptUntil: string | null
    daysRemaining: number | null
  }
  nextAssessment: {
    date: string
    daysRemaining: number
  }
  team: {
    members: {
      id: string
      name: string
      memberId: string
      email: string
      role: string
      createdAt: string
    }[]
    count: number
  }
  latestAssessment: {
    period: string
    totalSales: number
    previousRange: string
    newRange: string
    confirmedAt: string
  } | null
}

export function ManagerDashboard() {
  const [data, setData] = useState<ManagerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/manager/dashboard')
      const result = await res.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return null // エラー時はMGRダッシュボードを表示しない
  }

  const isOnTrack = data.currentPeriod.progressPercent >= 50 ||
                   data.currentPeriod.totalSales >= data.currentPeriod.maintainThreshold / 2

  return (
    <div className="space-y-6 mb-8">
      {/* MGRバナー */}
      <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <Award className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">FPエイドマネージャー</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                    {data.range?.name || 'レンジ未設定'}
                  </Badge>
                  {data.exemption.isExempt && (
                    <Badge variant="secondary" className="bg-yellow-500/30 text-yellow-100">
                      <Shield className="h-3 w-3 mr-1" />
                      査定免除中（残り{data.exemption.daysRemaining}日）
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {data.promotedAt && (
              <div className="text-right text-white/80">
                <p className="text-sm">MGR昇格日</p>
                <p className="font-medium">{formatDate(data.promotedAt)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 売上進捗 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              今期売上進捗
            </CardTitle>
            <CardDescription>{data.currentPeriod.label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-2xl font-bold">
                  {formatCurrency(data.currentPeriod.totalSales)}
                </span>
                <span className="text-muted-foreground">
                  / {formatCurrency(data.currentPeriod.maintainThreshold)}
                </span>
              </div>
              <Progress
                value={data.currentPeriod.progressPercent}
                className={`h-3 ${
                  data.currentPeriod.progressPercent >= 100
                    ? '[&>div]:bg-green-500'
                    : isOnTrack
                    ? '[&>div]:bg-blue-500'
                    : '[&>div]:bg-yellow-500'
                }`}
              />
              <div className="flex justify-between mt-2 text-sm">
                <span className={
                  data.currentPeriod.progressPercent >= 100
                    ? 'text-green-600'
                    : isOnTrack
                    ? 'text-blue-600'
                    : 'text-yellow-600'
                }>
                  {data.currentPeriod.progressPercent}% 達成
                </span>
                {data.currentPeriod.progressPercent >= 100 ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    維持基準達成
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    残り {formatCurrency(data.currentPeriod.maintainThreshold - data.currentPeriod.totalSales)}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">被保険者数（累計）</p>
              <p className="text-xl font-bold">{data.currentPeriod.totalInsuredCount}名</p>
            </div>
          </CardContent>
        </Card>

        {/* 次回査定・直近査定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              査定情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">次回査定まで</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{data.nextAssessment.daysRemaining}</span>
                <span className="text-muted-foreground">日</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(data.nextAssessment.date)}
              </p>
            </div>

            {data.latestAssessment && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">直近査定結果</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{data.latestAssessment.period}</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(data.latestAssessment.totalSales)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{data.latestAssessment.previousRange}</span>
                    {data.latestAssessment.previousRange === data.latestAssessment.newRange ? (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    ) : data.latestAssessment.newRange > data.latestAssessment.previousRange ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    )}
                    <span>{data.latestAssessment.newRange}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 月別売上 */}
      {data.currentPeriod.monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>月別売上推移</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {data.currentPeriod.monthlyData.map(m => (
                <div key={m.month} className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{m.month.split('-')[1]}月</p>
                  <p className="font-bold">{formatCurrency(m.salesAmount)}</p>
                  <p className="text-xs text-muted-foreground">{m.insuredCount}名</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 配下FP一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            配下FPエイド
            <Badge variant="secondary">{data.team.count}名</Badge>
          </CardTitle>
          <CardDescription>
            あなたが担当しているFPエイドの一覧です
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.team.count === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>配下FPエイドはまだいません</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会員番号</TableHead>
                  <TableHead>氏名</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>登録日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.team.members.map(member => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-sm">{member.memberId}</TableCell>
                    <TableCell>{member.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={member.role === 'MANAGER' ? 'default' : 'outline'}>
                        {member.role === 'MANAGER' ? 'MGR' : 'FP'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(member.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
