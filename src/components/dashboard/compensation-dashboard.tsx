'use client'

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
  FileText
} from "lucide-react"

interface CompensationDashboardProps {
  userRole: string
}

export function CompensationDashboard({ userRole }: CompensationDashboardProps) {
  // モックデータ
  const compensationData = {
    currentMonth: {
      amount: 125000,
      breakdown: {
        memberReferral: 60000, // 4名 × 15,000円
        fpReferral: 40000,     // 2名 × 20,000円
        contract: 20000,       // 契約報酬
        bonus: 5000,           // ボーナス
        deduction: 0           // 控除
      }
    },
    lastMonth: {
      amount: 98000
    },
    total: 450000,
    trend: 27.6 // 前月比増加率
  }

  const promotionConditions = {
    compensationAverage: {
      current: 111500, // 直近3ヶ月平均
      target: 70000,
      progress: 100
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
            <div className="text-2xl font-bold">{formatCurrency(compensationData.currentMonth.amount)}</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{compensationData.trend}% 前月比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">先月の報酬</CardTitle>
            <Calendar className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(compensationData.lastMonth.amount)}</div>
            <p className="text-xs text-slate-600">確定済み</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累計報酬</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(compensationData.total)}</div>
            <p className="text-xs text-slate-600">全期間合計</p>
          </CardContent>
        </Card>
      </div>

      {/* 今月の報酬内訳 */}
      <Card>
        <CardHeader>
          <CardTitle>今月の報酬内訳</CardTitle>
          <CardDescription>2024年1月分の詳細</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-slate-600" />
                <span className="text-sm">UGS会員紹介報酬</span>
              </div>
              <span className="font-medium">{formatCurrency(compensationData.currentMonth.breakdown.memberReferral)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-slate-600" />
                <span className="text-sm">FPエイド紹介報酬</span>
              </div>
              <span className="font-medium">{formatCurrency(compensationData.currentMonth.breakdown.fpReferral)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-slate-600" />
                <span className="text-sm">契約報酬</span>
              </div>
              <span className="font-medium">{formatCurrency(compensationData.currentMonth.breakdown.contract)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-slate-600" />
                <span className="text-sm">ボーナス・インセンティブ</span>
              </div>
              <span className="font-medium">{formatCurrency(compensationData.currentMonth.breakdown.bonus)}</span>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between items-center font-bold">
              <span>合計</span>
              <span>{formatCurrency(compensationData.currentMonth.amount)}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              PDF閲覧
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              CSV出力
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  <span className="text-sm font-medium">報酬実績（直近3ヶ月平均）</span>
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
