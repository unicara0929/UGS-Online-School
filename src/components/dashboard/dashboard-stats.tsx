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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">学習進捗</CardTitle>
          <BookOpen className="h-4 w-4 text-slate-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">25%</div>
          <p className="text-xs text-slate-600">基礎編 1/3 カテゴリ</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">今月の報酬</CardTitle>
          <DollarSign className="h-4 w-4 text-slate-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">¥0</div>
          <p className="text-xs text-slate-600">FPエイド昇格後に表示</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">昇格条件</CardTitle>
          <Target className="h-4 w-4 text-slate-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">1/3</div>
          <p className="text-xs text-slate-600">FPエイド昇格条件</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">今月のイベント</CardTitle>
          <Calendar className="h-4 w-4 text-slate-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">1</div>
          <p className="text-xs text-slate-600">月初MTG</p>
        </CardContent>
      </Card>
    </div>
  )
}
