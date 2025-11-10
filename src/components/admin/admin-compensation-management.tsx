'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  DollarSign, 
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Download,
  Eye
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

interface Compensation {
  id: string
  userId: string
  month: string
  amount: number
  breakdown: {
    memberReferral: number
    fpReferral: number
    contract: number
    bonus: number
    deduction: number
  }
  status: 'PENDING' | 'CONFIRMED' | 'PAID'
  createdAt: string
  user?: {
    id: string
    name: string
    email: string
  }
}

export function AdminCompensationManagement() {
  const { user } = useAuth()
  const [compensations, setCompensations] = useState<Compensation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateMonth, setGenerateMonth] = useState('')
  const [showGenerateForm, setShowGenerateForm] = useState(false)

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCompensations()
    }
  }, [user?.role])

  const fetchCompensations = async () => {
    try {
      // 全ユーザーの報酬を取得（ADMIN APIが必要）
      // 現時点では、個別に取得する必要があるかもしれません
      // ここではモックデータを表示
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching compensations:', error)
      setIsLoading(false)
    }
  }

  const handleGenerateCompensation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!generateMonth) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/admin/compensations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: generateMonth
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '報酬生成に失敗しました')
      }

      const data = await response.json()
      alert(`報酬生成が完了しました。成功: ${data.summary.succeeded}件、スキップ: ${data.summary.skipped}件、失敗: ${data.summary.failed}件`)
      setShowGenerateForm(false)
      setGenerateMonth('')
      await fetchCompensations()
    } catch (error: any) {
      alert(error.message || '報酬生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApprove = async (compensationId: string) => {
    try {
      const response = await fetch(`/api/admin/compensations/${compensationId}/approve`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('報酬の承認に失敗しました')
      }

      await fetchCompensations()
    } catch (error: any) {
      alert(error.message || '報酬の承認に失敗しました')
    }
  }

  const handlePay = async (compensationId: string) => {
    try {
      const response = await fetch(`/api/admin/compensations/${compensationId}/pay`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('報酬の支払いマークに失敗しました')
      }

      await fetchCompensations()
    } catch (error: any) {
      alert(error.message || '報酬の支払いマークに失敗しました')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800">支払済み</Badge>
      case 'CONFIRMED':
        return <Badge className="bg-blue-100 text-blue-800">承認済み</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">未承認</Badge>
    }
  }

  if (user?.role !== 'admin') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-slate-600">このページは管理者のみアクセスできます</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 報酬生成フォーム */}
      {showGenerateForm && (
        <Card>
          <CardHeader>
            <CardTitle>月次報酬を生成</CardTitle>
            <CardDescription>指定した月の報酬を自動計算して生成します</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateCompensation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  対象月（YYYY-MM形式） *
                </label>
                <input
                  type="month"
                  value={generateMonth}
                  onChange={(e) => setGenerateMonth(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      報酬を生成
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowGenerateForm(false)}>
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 報酬一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>報酬管理</CardTitle>
              <CardDescription>全ユーザーの報酬を管理します</CardDescription>
            </div>
            {!showGenerateForm && (
              <Button onClick={() => setShowGenerateForm(true)}>
                <DollarSign className="h-4 w-4 mr-2" />
                報酬を生成
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {compensations.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">まだ報酬が生成されていません</p>
              <Button onClick={() => setShowGenerateForm(true)} className="mt-4">
                <DollarSign className="h-4 w-4 mr-2" />
                最初の報酬を生成
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {compensations.map((compensation) => (
                <div
                  key={compensation.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <DollarSign className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="font-medium text-slate-900">
                          {compensation.user?.name || 'ユーザー'}
                        </p>
                        <p className="text-sm text-slate-600">{compensation.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                      <span>対象月: {compensation.month}</span>
                      <span className="font-medium text-slate-900">
                        合計: {formatCurrency(compensation.amount)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      内訳: UGS会員紹介 {formatCurrency(compensation.breakdown.memberReferral)} / 
                      FPエイド紹介 {formatCurrency(compensation.breakdown.fpReferral)} / 
                      契約 {formatCurrency(compensation.breakdown.contract)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {getStatusBadge(compensation.status)}
                    {compensation.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(compensation.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        承認
                      </Button>
                    )}
                    {compensation.status === 'CONFIRMED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePay(compensation.id)}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        支払済み
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

