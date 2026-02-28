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
  withholdingTax: number
  transferFee: number
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

interface MonthGroup {
  month: string
  compensations: Compensation[]
  count: number
  totalAmount: number
  totalWithholdingTax: number
  totalTransferFee: number
  totalNetAmount: number
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  return `${year}年${m}月`
}

export function AdminCompensationManagement() {
  const { user } = useAuth()
  const [compensations, setCompensations] = useState<Compensation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set())
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

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

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      if (next.has(month)) {
        next.delete(month)
      } else {
        next.add(month)
      }
      return next
    })
  }

  // 月別グループ化
  const monthGroups: MonthGroup[] = (() => {
    const grouped = new Map<string, Compensation[]>()
    for (const c of compensations) {
      const list = grouped.get(c.month) || []
      list.push(c)
      grouped.set(c.month, list)
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, comps]) => ({
        month,
        compensations: comps,
        count: comps.length,
        totalAmount: comps.reduce((sum, c) => sum + c.amount, 0),
        totalWithholdingTax: comps.reduce((sum, c) => sum + (c.withholdingTax || 0), 0),
        totalTransferFee: comps.reduce((sum, c) => sum + (c.transferFee || 0), 0),
        totalNetAmount: comps.reduce((sum, c) => sum + c.amount - (c.withholdingTax || 0) - (c.transferFee || 0), 0),
      }))
  })()

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
      // 最新月をデフォルト展開
      if (data.compensations.length > 0) {
        const months = data.compensations.map((c: Compensation) => c.month)
        const latestMonth = months.sort((a: string, b: string) => b.localeCompare(a))[0]
        setExpandedMonths(new Set([latestMonth]))
      }
    } catch (error) {
      console.error('Error fetching compensations:', error)
      alert(error instanceof Error ? error.message : '報酬情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }


  const downloadSample = () => {
    const csv = `会員番号,対象月,税込報酬,源泉徴収額,振込手数料
UGS0000001,2026-02,150000,15315,660
UGS0000002,2026-02,80000,8168,660`

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
            <div className="space-y-3">
              {monthGroups.map((group) => {
                const isExpanded = expandedMonths.has(group.month)
                return (
                  <div key={group.month} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* 月ヘッダー */}
                    <button
                      type="button"
                      onClick={() => toggleMonth(group.month)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-500 shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-500 shrink-0" aria-hidden="true" />
                        )}
                        <span className="font-semibold text-slate-900 text-lg">
                          {formatMonth(group.month)}
                        </span>
                        <Badge variant="secondary">{group.count}名</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>税込合計 <span className="font-medium text-slate-900 tabular-nums">{formatCurrency(group.totalAmount)}</span></span>
                        <span>差引合計 <span className="font-medium text-green-700 tabular-nums">{formatCurrency(group.totalNetAmount)}</span></span>
                      </div>
                    </button>

                    {/* 展開時テーブル */}
                    {isExpanded && (
                      <div className="border-t border-slate-200">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600">
                                <th className="px-4 py-2 text-left font-medium">氏名</th>
                                <th className="px-4 py-2 text-left font-medium">メール</th>
                                <th className="px-4 py-2 text-right font-medium">税込報酬</th>
                                <th className="px-4 py-2 text-right font-medium">源泉徴収額</th>
                                <th className="px-4 py-2 text-right font-medium">振込手数料</th>
                                <th className="px-4 py-2 text-right font-medium">差引支給額</th>
                                <th className="px-4 py-2 text-center font-medium">明細</th>
                                <th className="px-4 py-2 text-center font-medium">内訳</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.compensations.map((compensation) => {
                                const netAmount = compensation.amount - (compensation.withholdingTax || 0) - (compensation.transferFee || 0)
                                return (
                                  <tr key={compensation.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                      {compensation.user?.name || 'ユーザー'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">
                                      {compensation.user?.email}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                                      {formatCurrency(compensation.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-red-600">
                                      {(compensation.withholdingTax || 0) > 0
                                        ? `-${formatCurrency(compensation.withholdingTax)}`
                                        : formatCurrency(0)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-orange-600">
                                      {(compensation.transferFee || 0) > 0
                                        ? `-${formatCurrency(compensation.transferFee)}`
                                        : formatCurrency(0)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums font-medium text-green-700">
                                      {formatCurrency(netAmount)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {compensation.payslipPath ? (
                                        <span title="明細書アップロード済み">
                                          <FileCheck className="h-4 w-4 text-green-600 inline-block" aria-hidden="true" />
                                        </span>
                                      ) : (
                                        <span title="明細書未アップロード">
                                          <FileCheck className="h-4 w-4 text-slate-300 inline-block" aria-hidden="true" />
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {compensation.details && compensation.details.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleDetails(compensation.id)}
                                          className="text-xs text-slate-600 hover:text-slate-900 px-2 h-auto py-1"
                                        >
                                          {expandedDetails.has(compensation.id) ? (
                                            <ChevronUp className="h-3 w-3 mr-1" aria-hidden="true" />
                                          ) : (
                                            <ChevronDown className="h-3 w-3 mr-1" aria-hidden="true" />
                                          )}
                                          {compensation.details.length}件
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* 内訳展開エリア（テーブル外） */}
                        {group.compensations.map((compensation) =>
                          expandedDetails.has(compensation.id) && compensation.details && compensation.details.length > 0 ? (
                            <div key={`detail-${compensation.id}`} className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                              <p className="text-xs font-medium text-slate-700 mb-2">
                                {compensation.user?.name} の内訳
                              </p>
                              <div className="space-y-3">
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
                            </div>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

