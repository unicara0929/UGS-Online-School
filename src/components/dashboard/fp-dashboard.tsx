'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Loader2,
  TrendingUp,
  Users,
  UserPlus,
  Award,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react'

interface FPDashboardData {
  eligibility: {
    isEligible: boolean
    conditions: {
      salesTotal: { current: number; target: number; met: boolean }
      insuredCount: { current: number; target: number; met: boolean }
      memberReferrals: { current: number; target: number; met: boolean }
      fpReferrals: { current: number; target: number; met: boolean }
    }
  }
  salesSummary: {
    totalSales: number
    totalInsuredCount: number
    monthlyData: { month: string; salesAmount: number; insuredCount: number }[]
  }
}

export function FPDashboard() {
  const [data, setData] = useState<FPDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // 昇格条件をチェック
      const eligibilityRes = await fetch('/api/promotions/eligibility?targetRole=manager', {
        credentials: 'include'
      })
      const eligibilityData = await eligibilityRes.json()

      // FP売上サマリーを取得
      const salesRes = await fetch('/api/fp/sales-summary', {
        credentials: 'include'
      })
      const salesData = await salesRes.json()

      if (eligibilityData.success || eligibilityData.eligibility) {
        setData({
          eligibility: eligibilityData.eligibility,
          salesSummary: salesData.success ? salesData.summary : {
            totalSales: eligibilityData.eligibility?.conditions?.salesTotal?.current || 0,
            totalInsuredCount: eligibilityData.eligibility?.conditions?.insuredCount?.current || 0,
            monthlyData: []
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch FP dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { eligibility, salesSummary } = data
  const conditions = eligibility.conditions
  const metCount = [
    conditions.salesTotal?.met,
    conditions.insuredCount?.met,
    conditions.memberReferrals?.met,
    conditions.fpReferrals?.met
  ].filter(Boolean).length

  return (
    <div className="space-y-6 mb-8">
      {/* FPエイドバナー */}
      <Card className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <Award className="h-8 w-8" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">FPエイド</h2>
                <p className="text-white/80">マネージャー昇格を目指そう</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/80">昇格条件達成</p>
              <p className="text-3xl font-bold tabular-nums">{metCount}/4</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 売上・被保険者サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" aria-hidden="true" />
              売上実績（過去6ヶ月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-3xl font-bold tabular-nums">
                    {formatCurrency(conditions.salesTotal?.current || 0)}
                  </span>
                  <span className="text-muted-foreground self-end tabular-nums">
                    / {formatCurrency(conditions.salesTotal?.target || 420000)}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, ((conditions.salesTotal?.current || 0) / (conditions.salesTotal?.target || 420000)) * 100)}
                  className={`h-3 ${conditions.salesTotal?.met ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'}`}
                />
                <div className="flex justify-between mt-2 text-sm">
                  <span className={`tabular-nums ${conditions.salesTotal?.met ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {Math.round(((conditions.salesTotal?.current || 0) / (conditions.salesTotal?.target || 420000)) * 100)}% 達成
                  </span>
                  {conditions.salesTotal?.met ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      条件達成
                    </span>
                  ) : (
                    <span className="text-muted-foreground tabular-nums">
                      残り {formatCurrency((conditions.salesTotal?.target || 420000) - (conditions.salesTotal?.current || 0))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" aria-hidden="true" />
              被保険者数（累計）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-3xl font-bold tabular-nums">
                    {conditions.insuredCount?.current || 0}名
                  </span>
                  <span className="text-muted-foreground self-end tabular-nums">
                    / {conditions.insuredCount?.target || 20}名
                  </span>
                </div>
                <Progress
                  value={Math.min(100, ((conditions.insuredCount?.current || 0) / (conditions.insuredCount?.target || 20)) * 100)}
                  className={`h-3 ${conditions.insuredCount?.met ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'}`}
                />
                <div className="flex justify-between mt-2 text-sm">
                  <span className={`tabular-nums ${conditions.insuredCount?.met ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {Math.round(((conditions.insuredCount?.current || 0) / (conditions.insuredCount?.target || 20)) * 100)}% 達成
                  </span>
                  {conditions.insuredCount?.met ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      条件達成
                    </span>
                  ) : (
                    <span className="text-muted-foreground tabular-nums">
                      残り {(conditions.insuredCount?.target || 20) - (conditions.insuredCount?.current || 0)}名
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 昇格条件進捗 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Award className="h-5 w-5" aria-hidden="true" />
              マネージャー昇格条件
            </span>
            {eligibility.isEligible && (
              <Badge className="bg-green-500">申請可能</Badge>
            )}
          </CardTitle>
          <CardDescription>
            すべての条件を達成するとマネージャーに昇格申請できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 売上 */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {conditions.salesTotal?.met ? (
                  <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-400" aria-hidden="true" />
                )}
                <div>
                  <p className="font-medium">売上42万円以上</p>
                  <p className="text-sm text-muted-foreground">過去6ヶ月</p>
                </div>
              </div>
              <Badge variant={conditions.salesTotal?.met ? "default" : "secondary"}>
                {conditions.salesTotal?.met ? "達成" : "未達成"}
              </Badge>
            </div>

            {/* 被保険者 */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {conditions.insuredCount?.met ? (
                  <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-400" aria-hidden="true" />
                )}
                <div>
                  <p className="font-medium">被保険者20名以上</p>
                  <p className="text-sm text-muted-foreground">累計</p>
                </div>
              </div>
              <Badge variant={conditions.insuredCount?.met ? "default" : "secondary"}>
                {conditions.insuredCount?.met ? "達成" : "未達成"}
              </Badge>
            </div>

            {/* 会員紹介 */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {conditions.memberReferrals?.met ? (
                  <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-400" aria-hidden="true" />
                )}
                <div>
                  <p className="font-medium">UGS会員8名紹介</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    現在 {conditions.memberReferrals?.current || 0}名
                  </p>
                </div>
              </div>
              <Badge variant={conditions.memberReferrals?.met ? "default" : "secondary"}>
                {conditions.memberReferrals?.met ? "達成" : "未達成"}
              </Badge>
            </div>

            {/* FP輩出 */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {conditions.fpReferrals?.met ? (
                  <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-400" aria-hidden="true" />
                )}
                <div>
                  <p className="font-medium">FPエイド4名輩出</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    現在 {conditions.fpReferrals?.current || 0}名
                  </p>
                </div>
              </div>
              <Badge variant={conditions.fpReferrals?.met ? "default" : "secondary"}>
                {conditions.fpReferrals?.met ? "達成" : "未達成"}
              </Badge>
            </div>
          </div>

          {/* 昇格申請ボタン */}
          <div className="mt-6">
            <Link href="/dashboard/promotion">
              <Button className="w-full" disabled={!eligibility.isEligible}>
                {eligibility.isEligible ? (
                  <>
                    <Award className="h-4 w-4 mr-2" aria-hidden="true" />
                    昇格申請へ進む
                  </>
                ) : (
                  <>
                    詳細を確認
                    <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                  </>
                )}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
