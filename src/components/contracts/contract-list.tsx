'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  Loader2
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

interface Contract {
  id: string
  userId: string
  contractNumber: string
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchContracts()
    }
  }, [user?.id])

  const fetchContracts = async () => {
    if (!user?.id) return

    try {
      const response = await fetch('/api/contracts')
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

  const handleAddContract = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user?.id) return

    const formData = new FormData(e.currentTarget)
    const contractNumber = formData.get('contractNumber') as string
    const contractType = formData.get('contractType') as 'INSURANCE' | 'OTHER'
    const signedAt = formData.get('signedAt') as string
    const amount = formData.get('amount') ? parseInt(formData.get('amount') as string) : null

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractNumber,
          contractType,
          signedAt,
          amount
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '契約の登録に失敗しました')
      }

      await fetchContracts()
      setShowAddForm(false)
      e.currentTarget.reset()
    } catch (error: any) {
      alert(error.message || '契約の登録に失敗しました')
    } finally {
      setIsSubmitting(false)
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

      {/* 契約追加フォーム */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>契約を登録</CardTitle>
            <CardDescription>新しい契約を登録します</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddContract} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  契約番号 *
                </label>
                <input
                  type="text"
                  name="contractNumber"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="CONTRACT-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  契約タイプ *
                </label>
                <select
                  name="contractType"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="INSURANCE">保険契約</option>
                  <option value="OTHER">その他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  契約日 *
                </label>
                <input
                  type="date"
                  name="signedAt"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  契約金額（円）
                </label>
                <input
                  type="number"
                  name="amount"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="100000"
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      登録中...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      登録
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 契約一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>契約一覧</CardTitle>
              <CardDescription>あなたの契約実績</CardDescription>
            </div>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                契約を追加
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">まだ契約が登録されていません</p>
              <Button onClick={() => setShowAddForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                最初の契約を登録
              </Button>
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

