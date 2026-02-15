'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrency } from "@/lib/utils"
import {
  CheckCircle,
  XCircle,
  Award,
  TrendingUp,
  Users,
  UserPlus,
  Loader2
} from "lucide-react"

interface PromotionEligibility {
  isEligible: boolean
  conditions: {
    salesTotal?: {
      current: number
      target: number
      met: boolean
    }
    insuredCount?: {
      current: number
      target: number
      met: boolean
    }
    memberReferrals?: {
      current: number
      target: number
      met: boolean
    }
    fpReferrals?: {
      current: number
      target: number
      met: boolean
    }
  }
}

export function ManagerPromotion() {
  const { user } = useAuth()
  const [eligibility, setEligibility] = useState<PromotionEligibility | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    if (user?.id && user?.role === 'fp') {
      checkEligibility()
    }
  }, [user?.id, user?.role])

  const checkEligibility = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/promotions/eligibility?userId=${user.id}&targetRole=manager`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('昇格可能性のチェックに失敗しました')
      }
      const data = await response.json()
      setEligibility(data.eligibility)
    } catch (error) {
      console.error('Error checking eligibility:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async () => {
    if (!user?.id || !eligibility?.isEligible) return

    setIsApplying(true)
    try {
      const response = await fetch('/api/promotions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          targetRole: 'manager'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '昇格申請に失敗しました')
      }

      alert('昇格申請が完了しました。審査結果をお待ちください。')
      await checkEligibility()
    } catch (error: any) {
      alert(error.message || '昇格申請に失敗しました')
    } finally {
      setIsApplying(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" aria-hidden="true" />
      </div>
    )
  }

  if (!eligibility) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-slate-600">昇格可能性の確認に失敗しました</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const conditions = eligibility.conditions

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2" aria-hidden="true" />
            マネージャー昇格条件
          </CardTitle>
          <CardDescription>
            マネージャーに昇格するために必要な条件（過去6ヶ月間）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* ① 売上実績 */}
            {conditions.salesTotal && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-slate-500" aria-hidden="true" />
                    売上合計（過去6ヶ月）
                  </span>
                  <span className="text-sm">
                    {formatCurrency(conditions.salesTotal.current)} / {formatCurrency(conditions.salesTotal.target)}
                  </span>
                </div>
                <Progress
                  value={
                    conditions.salesTotal.target > 0
                      ? Math.min(100, (conditions.salesTotal.current / conditions.salesTotal.target) * 100)
                      : 0
                  }
                  className="h-2"
                />
                <div className="flex items-center mt-2">
                  {conditions.salesTotal.met ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mr-1" aria-hidden="true" />
                  )}
                  <Badge variant={conditions.salesTotal.met ? "default" : "secondary"}>
                    {conditions.salesTotal.met ? "達成" : "未達成"}
                  </Badge>
                </div>
              </div>
            )}

            {/* ② 被保険者数 */}
            {conditions.insuredCount && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2 text-slate-500" aria-hidden="true" />
                    被保険者数（累計）
                  </span>
                  <span className="text-sm">
                    {conditions.insuredCount.current} / {conditions.insuredCount.target}名
                  </span>
                </div>
                <Progress
                  value={
                    conditions.insuredCount.target > 0
                      ? Math.min(100, (conditions.insuredCount.current / conditions.insuredCount.target) * 100)
                      : 0
                  }
                  className="h-2"
                />
                <div className="flex items-center mt-2">
                  {conditions.insuredCount.met ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mr-1" aria-hidden="true" />
                  )}
                  <Badge variant={conditions.insuredCount.met ? "default" : "secondary"}>
                    {conditions.insuredCount.met ? "達成" : "未達成"}
                  </Badge>
                </div>
              </div>
            )}

            {/* ③ UGS会員紹介 */}
            {conditions.memberReferrals && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium flex items-center">
                    <UserPlus className="h-4 w-4 mr-2 text-slate-500" aria-hidden="true" />
                    UGS会員紹介（6ヶ月以内、登録維持中）
                  </span>
                  <span className="text-sm">
                    {conditions.memberReferrals.current} / {conditions.memberReferrals.target}名
                  </span>
                </div>
                <Progress
                  value={
                    conditions.memberReferrals.target > 0
                      ? Math.min(100, (conditions.memberReferrals.current / conditions.memberReferrals.target) * 100)
                      : 0
                  }
                  className="h-2"
                />
                <div className="flex items-center mt-2">
                  {conditions.memberReferrals.met ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mr-1" aria-hidden="true" />
                  )}
                  <Badge variant={conditions.memberReferrals.met ? "default" : "secondary"}>
                    {conditions.memberReferrals.met ? "達成" : "未達成"}
                  </Badge>
                </div>
              </div>
            )}

            {/* ④ FPエイド輩出 */}
            {conditions.fpReferrals && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium flex items-center">
                    <Award className="h-4 w-4 mr-2 text-slate-500" aria-hidden="true" />
                    FPエイド輩出（6ヶ月以内、職位維持中）
                  </span>
                  <span className="text-sm">
                    {conditions.fpReferrals.current} / {conditions.fpReferrals.target}名
                  </span>
                </div>
                <Progress
                  value={
                    conditions.fpReferrals.target > 0
                      ? Math.min(100, (conditions.fpReferrals.current / conditions.fpReferrals.target) * 100)
                      : 0
                  }
                  className="h-2"
                />
                <div className="flex items-center mt-2">
                  {conditions.fpReferrals.met ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mr-1" aria-hidden="true" />
                  )}
                  <Badge variant={conditions.fpReferrals.met ? "default" : "secondary"}>
                    {conditions.fpReferrals.met ? "達成" : "未達成"}
                  </Badge>
                </div>
              </div>
            )}

            {/* 申請ボタン */}
            <div className="pt-4 border-t">
              <Button
                className="w-full"
                disabled={!eligibility.isEligible || isApplying}
                onClick={handleApply}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    申請中...
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4 mr-2" aria-hidden="true" />
                    マネージャー昇格を申請
                  </>
                )}
              </Button>
              {!eligibility.isEligible && (
                <p className="text-sm text-slate-600 text-center mt-2">
                  すべての条件を達成すると申請できます
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
