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
  FileText,
  Loader2
} from "lucide-react"

interface PromotionEligibility {
  isEligible: boolean
  conditions: {
    compensationAverage?: {
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
    contractAchieved?: boolean
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
      const response = await fetch(`/api/promotions/eligibility?userId=${user.id}&targetRole=manager`)
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
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
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
            <Award className="h-5 w-5 mr-2" />
            マネージャー昇格条件
          </CardTitle>
          <CardDescription>
            マネージャーに昇格するために必要な条件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 報酬実績 */}
            {conditions.compensationAverage && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">報酬実績（直近3ヶ月平均）</span>
                  <span className="text-sm">
                    {formatCurrency(conditions.compensationAverage.current)} / {formatCurrency(conditions.compensationAverage.target)}
                  </span>
                </div>
                <Progress 
                  value={
                    conditions.compensationAverage.target > 0
                      ? (conditions.compensationAverage.current / conditions.compensationAverage.target) * 100
                      : 0
                  } 
                  className="h-2" 
                />
                <div className="flex items-center mt-2">
                  {conditions.compensationAverage.met ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <Badge variant={conditions.compensationAverage.met ? "default" : "secondary"}>
                    {conditions.compensationAverage.met ? "達成" : "未達成"}
                  </Badge>
                </div>
              </div>
            )}

            {/* UGS会員紹介 */}
            {conditions.memberReferrals && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">UGS会員紹介（6ヶ月間）</span>
                  <span className="text-sm">
                    {conditions.memberReferrals.current} / {conditions.memberReferrals.target}名
                  </span>
                </div>
                <Progress 
                  value={
                    conditions.memberReferrals.target > 0
                      ? (conditions.memberReferrals.current / conditions.memberReferrals.target) * 100
                      : 0
                  } 
                  className="h-2" 
                />
                <div className="flex items-center mt-2">
                  {conditions.memberReferrals.met ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <Badge variant={conditions.memberReferrals.met ? "default" : "secondary"}>
                    {conditions.memberReferrals.met ? "達成" : "未達成"}
                  </Badge>
                </div>
              </div>
            )}

            {/* FPエイド紹介 */}
            {conditions.fpReferrals && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">FPエイド紹介（6ヶ月間）</span>
                  <span className="text-sm">
                    {conditions.fpReferrals.current} / {conditions.fpReferrals.target}名
                  </span>
                </div>
                <Progress 
                  value={
                    conditions.fpReferrals.target > 0
                      ? (conditions.fpReferrals.current / conditions.fpReferrals.target) * 100
                      : 0
                  } 
                  className="h-2" 
                />
                <div className="flex items-center mt-2">
                  {conditions.fpReferrals.met ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <Badge variant={conditions.fpReferrals.met ? "default" : "secondary"}>
                    {conditions.fpReferrals.met ? "達成" : "未達成"}
                  </Badge>
                </div>
              </div>
            )}

            {/* 契約実績 */}
            {conditions.contractAchieved !== undefined && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">契約実績（直20被保）</span>
                  <div className="flex items-center">
                    {conditions.contractAchieved ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <Badge variant={conditions.contractAchieved ? "default" : "secondary"}>
                      {conditions.contractAchieved ? "達成" : "未達成"}
                    </Badge>
                  </div>
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    申請中...
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4 mr-2" />
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

