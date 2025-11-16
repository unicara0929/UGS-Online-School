'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  DollarSign,
  Loader2,
  Filter
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

interface Contract {
  id: string
  userId: string
  contractNumber: string
  productName: string | null
  contractType: 'INSURANCE' | 'OTHER'
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  signedAt: string
  amount: number | null
  rewardAmount: number | null
  createdAt: string
}

export function ContractList() {
  const { user } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [monthFilter, setMonthFilter] = useState<string>('')

  useEffect(() => {
    if (user?.id) {
      fetchContracts()
    }
  }, [user?.id, statusFilter, monthFilter])

  const fetchContracts = async () => {
    if (!user?.id) return

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter)
      }
      if (monthFilter) {
        params.append('month', monthFilter)
      }

      const queryString = params.toString()
      const url = `/api/contracts${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('契約一覧の取得に失敗しました')
      }
      const data = await response.json()
      setContracts(data.contracts || [])
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">有効</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">解約</Badge>
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-800">期限切れ</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getContractTypeLabel = (type: string) => {
    return type === 'INSURANCE' ? '保険契約' : 'その他'
  }

  const totalReward = contracts
    .filter(c => c.status === 'ACTIVE')
    .reduce((sum, c) => sum + (c.rewardAmount || 0), 0)

  const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">有効契約数</CardTitle>
            <FileText className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts}</div>
            <p className="text-xs text-slate-600">件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総契約数</CardTitle>
            <FileText className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.length}</div>
            <p className="text-xs text-slate-600">件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">契約報酬合計</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReward)}</div>
            <p className="text-xs text-slate-600">有効契約のみ</p>
          </CardContent>
        </Card>
      </div>

      {/* フィルタ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            フィルタ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">ステータス</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全て</SelectItem>
                  <SelectItem value="ACTIVE">有効</SelectItem>
                  <SelectItem value="CANCELLED">解約</SelectItem>
                  <SelectItem value="EXPIRED">期限切れ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">契約月</label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            {(statusFilter !== 'ALL' || monthFilter) && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('ALL')
                    setMonthFilter('')
                  }}
                >
                  クリア
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 契約一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>契約一覧</CardTitle>
              <CardDescription>あなたの契約実績</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">まだ契約が登録されていません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="font-medium text-slate-900">{contract.contractNumber}</p>
                        {contract.productName && (
                          <p className="text-sm font-medium text-slate-700">{contract.productName}</p>
                        )}
                        <p className="text-sm text-slate-600">{getContractTypeLabel(contract.contractType)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                      <span>契約日: {formatDate(contract.signedAt)}</span>
                      {contract.amount && (
                        <span>契約金額: {formatCurrency(contract.amount)}</span>
                      )}
                      {contract.rewardAmount && (
                        <span className="font-medium text-green-600">
                          報酬: {formatCurrency(contract.rewardAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {getStatusBadge(contract.status)}
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

