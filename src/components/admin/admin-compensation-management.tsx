'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  Upload,
  Loader2
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

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

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCompensations()
    }
  }, [user?.role])

  const fetchCompensations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/compensations', {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '報酬情報の取得に失敗しました')
      }

      setCompensations(data.compensations)
    } catch (error) {
      console.error('Error fetching compensations:', error)
      alert(error instanceof Error ? error.message : '報酬情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
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
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 報酬一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>報酬管理</CardTitle>
              <CardDescription>全ユーザーの報酬を管理します（CSV一括アップロードで更新）</CardDescription>
            </div>
            <Link href="/dashboard/admin/csv-upload">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                CSV一括アップロード
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {compensations.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" aria-hidden="true" />
              <p className="text-slate-600">まだ報酬データがありません</p>
              <p className="text-sm text-slate-500 mt-2">CSV一括アップロードから報酬データを登録してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {compensations.map((compensation) => (
                <div
                  key={compensation.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <DollarSign className="h-5 w-5 text-slate-600" aria-hidden="true" />
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
                    <Badge className="bg-green-100 text-green-800">支払済み</Badge>
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

