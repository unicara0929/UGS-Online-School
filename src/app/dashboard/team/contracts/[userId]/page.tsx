'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, FileCheck, Building2, Home, Sun, Briefcase, Shield, HelpCircle } from 'lucide-react'

// 契約種別の定義
const CONTRACT_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  INSURANCE: { label: '保険', icon: Shield, color: 'bg-blue-100 text-blue-800' },
  REAL_ESTATE: { label: '不動産', icon: Building2, color: 'bg-green-100 text-green-800' },
  RENTAL: { label: '賃貸', icon: Home, color: 'bg-purple-100 text-purple-800' },
  SOLAR_BATTERY: { label: '太陽光/蓄電池', icon: Sun, color: 'bg-yellow-100 text-yellow-800' },
  CAREER: { label: '転職', icon: Briefcase, color: 'bg-orange-100 text-orange-800' },
  HOUSING: { label: '住宅', icon: Home, color: 'bg-teal-100 text-teal-800' },
  OTHER: { label: 'その他', icon: HelpCircle, color: 'bg-slate-100 text-slate-800' },
}

interface ContractDetail {
  id: string
  contractNumber: string
  productName: string | null
  customerName: string | null
  amount: number | null
  rewardAmount: number | null
  signedAt: string
  note: string | null
}

interface ContractsByType {
  count: number
  totalAmount: number
  totalReward: number
  contracts: ContractDetail[]
}

interface ContractsData {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  contractsByType: Record<string, ContractsByType>
  totals: {
    count: number
    totalAmount: number
    totalReward: number
  }
}

function TeamContractsPageContent({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter()
  const { userId } = use(params)
  const [contractsData, setContractsData] = useState<ContractsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchContracts()
  }, [userId])

  const fetchContracts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/team/contracts/${userId}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setContractsData(data)
      } else {
        setError(data.error || '契約データの取得に失敗しました')
      }
    } catch (err) {
      console.error('Error fetching contracts:', err)
      setError('契約データの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-'
    return `¥${amount.toLocaleString()}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="契約詳細" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-slate-600">読み込み中...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="契約詳細" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
                <Button
                  onClick={() => router.push('/dashboard/team')}
                  variant="outline"
                  className="mt-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  チーム管理に戻る
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <PageHeader title="契約詳細" />
        <main className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* 戻るボタンとタイトル */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/dashboard/team')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {contractsData?.user.name} さんの契約一覧
                </h1>
                <p className="text-slate-600 text-sm">{contractsData?.user.email}</p>
              </div>
            </div>
          </div>

          {/* 合計サマリー */}
          {contractsData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-blue-600 font-medium">総契約数</p>
                    <p className="text-3xl font-bold text-blue-800">{contractsData.totals.count}件</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-green-600 font-medium">総契約金額</p>
                    <p className="text-3xl font-bold text-green-800">{formatCurrency(contractsData.totals.totalAmount)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-orange-600 font-medium">総報酬額</p>
                    <p className="text-3xl font-bold text-orange-800">{formatCurrency(contractsData.totals.totalReward)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 種別ごとの内訳 */}
          {contractsData && Object.keys(contractsData.contractsByType).length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="py-12">
                <div className="text-center text-slate-500">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-lg font-medium">契約データがありません</p>
                  <p className="text-sm mt-2">このFPエイドの契約はまだ登録されていません</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            contractsData && Object.entries(contractsData.contractsByType).map(([type, data]) => {
              const config = CONTRACT_TYPE_CONFIG[type] || CONTRACT_TYPE_CONFIG.OTHER
              const Icon = config.icon

              return (
                <Card key={type} className="shadow-lg overflow-hidden">
                  {/* 種別ヘッダー */}
                  <CardHeader className={`${config.color} py-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5" />
                        <CardTitle className="text-lg">{config.label}</CardTitle>
                        <Badge variant="secondary" className="ml-2">{data.count}件</Badge>
                      </div>
                      <div className="text-sm">
                        報酬合計: <span className="font-bold">{formatCurrency(data.totalReward)}</span>
                      </div>
                    </div>
                  </CardHeader>

                  {/* 契約一覧テーブル */}
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>契約番号</TableHead>
                          <TableHead>商品名</TableHead>
                          <TableHead>契約者名</TableHead>
                          <TableHead className="text-right">契約金額</TableHead>
                          <TableHead className="text-right">報酬額</TableHead>
                          <TableHead>契約日</TableHead>
                          <TableHead>メモ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.contracts.map((contract) => (
                          <TableRow key={contract.id} className="hover:bg-slate-50">
                            <TableCell className="font-mono text-sm">{contract.contractNumber}</TableCell>
                            <TableCell>{contract.productName || '-'}</TableCell>
                            <TableCell>{contract.customerName || '-'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(contract.amount)}</TableCell>
                            <TableCell className="text-right font-medium text-orange-600">
                              {formatCurrency(contract.rewardAmount)}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {new Date(contract.signedAt).toLocaleDateString('ja-JP')}
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm max-w-xs truncate">
                              {contract.note || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )
            })
          )}
        </main>
      </div>
    </div>
  )
}

export default function TeamContractsPage({ params }: { params: Promise<{ userId: string }> }) {
  return (
    <ProtectedRoute requiredRoles={['manager', 'admin']}>
      <TeamContractsPageContent params={params} />
    </ProtectedRoute>
  )
}
