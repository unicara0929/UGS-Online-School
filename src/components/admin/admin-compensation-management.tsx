'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  Upload,
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
  FileCheck,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

interface CompensationDetail {
  id: string
  compensationId: string
  businessType: 'REAL_ESTATE' | 'INSURANCE'
  amount: number
  details: {
    number?: string
    customerName?: string
    property?: string
    contractDate?: string
    company?: string
    type?: string
    insuranceType?: string
    contractorName?: string
  }
}

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
  payslipPath?: string | null
  status: 'PENDING' | 'CONFIRMED' | 'PAID'
  details?: CompensationDetail[]
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
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set())

  const toggleDetails = (id: string) => {
    setExpandedDetails(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

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


  const downloadSample = () => {
    const csv = `会員番号,対象月,税込報酬,源泉徴収額
UGS0000001,2026-02,150000,15315
UGS0000002,2026-02,80000,8168`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'compensation_sample.csv'
    link.click()
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
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={downloadSample}>
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                サンプルCSV
              </Button>
              <Link href="/dashboard/admin/csv-upload">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                  CSV一括アップロード
                </Button>
              </Link>
            </div>
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

                    {/* 報酬内訳（CompensationDetail） */}
                    {compensation.details && compensation.details.length > 0 && (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDetails(compensation.id)}
                          className="text-xs text-slate-600 hover:text-slate-900 px-1 h-auto py-1"
                        >
                          {expandedDetails.has(compensation.id) ? (
                            <ChevronUp className="h-3 w-3 mr-1" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-3 w-3 mr-1" aria-hidden="true" />
                          )}
                          内訳を見る（{compensation.details.length}件）
                        </Button>

                        {expandedDetails.has(compensation.id) && (
                          <div className="mt-2 space-y-3">
                            {compensation.details.filter(d => d.businessType === 'REAL_ESTATE').length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1">不動産</p>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-100">
                                        <th className="px-2 py-1 text-left">番号</th>
                                        <th className="px-2 py-1 text-left">紹介顧客</th>
                                        <th className="px-2 py-1 text-left">成約物件</th>
                                        <th className="px-2 py-1 text-left">契約日</th>
                                        <th className="px-2 py-1 text-right">報酬額</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {compensation.details.filter(d => d.businessType === 'REAL_ESTATE').map((detail) => (
                                        <tr key={detail.id} className="border-b border-slate-100">
                                          <td className="px-2 py-1">{detail.details.number}</td>
                                          <td className="px-2 py-1">{detail.details.customerName}</td>
                                          <td className="px-2 py-1">{detail.details.property}</td>
                                          <td className="px-2 py-1">{detail.details.contractDate}</td>
                                          <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(detail.amount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {compensation.details.filter(d => d.businessType === 'INSURANCE').length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1">保険</p>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-100">
                                        <th className="px-2 py-1 text-left">会社</th>
                                        <th className="px-2 py-1 text-left">タイプ</th>
                                        <th className="px-2 py-1 text-left">保険種類</th>
                                        <th className="px-2 py-1 text-left">契約者名</th>
                                        <th className="px-2 py-1 text-right">手数料額</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {compensation.details.filter(d => d.businessType === 'INSURANCE').map((detail) => (
                                        <tr key={detail.id} className="border-b border-slate-100">
                                          <td className="px-2 py-1">{detail.details.company}</td>
                                          <td className="px-2 py-1">{detail.details.type}</td>
                                          <td className="px-2 py-1">{detail.details.insuranceType}</td>
                                          <td className="px-2 py-1">{detail.details.contractorName}</td>
                                          <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(detail.amount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    {compensation.payslipPath ? (
                      <span title="明細書アップロード済み">
                        <FileCheck className="h-5 w-5 text-green-600" aria-hidden="true" />
                      </span>
                    ) : (
                      <span title="明細書未アップロード">
                        <FileCheck className="h-5 w-5 text-slate-300" aria-hidden="true" />
                      </span>
                    )}
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

