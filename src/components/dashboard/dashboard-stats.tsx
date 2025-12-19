'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BookOpen,
  DollarSign,
  Target,
  Calendar,
  Loader2
} from "lucide-react"

interface DashboardStatsProps {
  userRole: string
}

interface PromotionConditions {
  // UGS会員→FPエイド昇格条件
  lpMeetingCompleted?: boolean
  surveyCompleted?: boolean
  // FPエイド→マネージャー昇格条件
  salesTotal?: { current: number; target: number; met: boolean }
  insuredCount?: { current: number; target: number; met: boolean }
  memberReferrals?: { current: number; target: number; met: boolean }
  fpReferrals?: { current: number; target: number; met: boolean }
}

export function DashboardStats({ userRole }: DashboardStatsProps) {
  const [promotionData, setPromotionData] = useState<{ met: number; total: number; label: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // FPエイド以上かどうかを判定（FP, MANAGER, ADMINは報酬表示）
  const isFPOrAbove = ['fp', 'manager', 'admin'].includes(userRole.toLowerCase())
  const isMember = userRole.toLowerCase() === 'member'

  useEffect(() => {
    fetchPromotionData()
  }, [userRole])

  const fetchPromotionData = async () => {
    try {
      setIsLoading(true)

      if (isMember) {
        // UGS会員→FPエイド昇格条件
        const response = await fetch('/api/promotions/eligibility?targetRole=fp', {
          credentials: 'include'
        })
        const data = await response.json()

        if (data.success && data.eligibility?.conditions) {
          const conditions = data.eligibility.conditions
          const met = [conditions.lpMeetingCompleted, conditions.surveyCompleted].filter(Boolean).length
          setPromotionData({ met, total: 2, label: 'FPエイド昇格' })
        }
      } else if (userRole.toLowerCase() === 'fp') {
        // FPエイド→マネージャー昇格条件
        const response = await fetch('/api/promotions/eligibility?targetRole=manager', {
          credentials: 'include'
        })
        const data = await response.json()

        if (data.eligibility?.conditions) {
          const conditions = data.eligibility.conditions as PromotionConditions
          const met = [
            conditions.salesTotal?.met,
            conditions.insuredCount?.met,
            conditions.memberReferrals?.met,
            conditions.fpReferrals?.met
          ].filter(Boolean).length
          setPromotionData({ met, total: 4, label: 'MGR昇格' })
        }
      } else {
        // マネージャー以上は昇格条件なし
        setPromotionData(null)
      }
    } catch (error) {
      console.error('Failed to fetch promotion data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`grid grid-cols-2 ${isFPOrAbove ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 sm:gap-6 mb-6 sm:mb-8`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">学習進捗</CardTitle>
          <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="text-lg sm:text-2xl font-bold">25%</div>
          <p className="text-[10px] sm:text-xs text-slate-600">基礎編 1/3</p>
        </CardContent>
      </Card>

      {/* FPエイド以上のみ報酬カードを表示 */}
      {isFPOrAbove && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">今月の報酬</CardTitle>
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">¥0</div>
            <p className="text-[10px] sm:text-xs text-slate-600">今月の報酬額</p>
          </CardContent>
        </Card>
      )}

      {/* 昇格条件（マネージャー以上には表示しない） */}
      {promotionData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">昇格条件</CardTitle>
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold">{promotionData.met}/{promotionData.total}</div>
                <p className="text-[10px] sm:text-xs text-slate-600">{promotionData.label}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">今月イベント</CardTitle>
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="text-lg sm:text-2xl font-bold">1</div>
          <p className="text-[10px] sm:text-xs text-slate-600">月初MTG</p>
        </CardContent>
      </Card>
    </div>
  )
}
