'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BookOpen, 
  DollarSign,
  Target,
  Calendar
} from "lucide-react"

interface DashboardStatsProps {
  userRole: string
}

export function DashboardStats({ userRole }: DashboardStatsProps) {
  // FPエイド以上かどうかを判定（FP, MANAGER, ADMINは報酬表示）
  const isFPOrAbove = ['FP', 'MANAGER', 'ADMIN'].includes(userRole)

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">昇格条件</CardTitle>
          <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="text-lg sm:text-2xl font-bold">1/3</div>
          <p className="text-[10px] sm:text-xs text-slate-600">FPエイド昇格</p>
        </CardContent>
      </Card>

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
