'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  ArrowLeft,
  FileCheck,
  Building2,
  Home,
  Sun,
  Briefcase,
  Shield,
  HelpCircle,
  FileText,
  DollarSign,
  Hash,
  Package,
  User,
  Calendar
} from 'lucide-react'

// 契約種別の設定
const CONTRACT_TYPES = {
  INSURANCE: {
    label: '保険',
    icon: Shield,
    color: 'bg-blue-100 text-blue-800',
    description: '生命保険・損害保険などの契約'
  },
  REAL_ESTATE: {
    label: '不動産',
    icon: Building2,
    color: 'bg-green-100 text-green-800',
    description: '不動産売買・投資物件などの契約'
  },
  RENTAL: {
    label: '賃貸',
    icon: Home,
    color: 'bg-purple-100 text-purple-800',
    description: '賃貸物件仲介の契約'
  },
  SOLAR_BATTERY: {
    label: '太陽光/蓄電池',
    icon: Sun,
    color: 'bg-yellow-100 text-yellow-800',
    description: '太陽光パネル・蓄電池設置の契約'
  },
  CAREER: {
    label: '転職',
    icon: Briefcase,
    color: 'bg-orange-100 text-orange-800',
    description: '転職支援・人材紹介の契約'
  },
  HOUSING: {
    label: '住宅',
    icon: Home,
    color: 'bg-teal-100 text-teal-800',
    description: '住宅購入・リフォームの契約'
  },
  OTHER: {
    label: 'その他',
    icon: HelpCircle,
    color: 'bg-slate-100 text-slate-800',
    description: 'その他の契約'
  },
} as const

type ContractType = keyof typeof CONTRACT_TYPES

interface ContractDetail {
  id: string
  contractNumber: string
  contractType: ContractType
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
  const [activeTab, setActiveTab] = useState<string>('ALL')

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
    if (amount === null || amount === 0) return '-'
    return `¥${amount.toLocaleString()}`
  }

  // 全ての契約を取得
  const getAllContracts = (): ContractDetail[] => {
    if (!contractsData) return []
    const allContracts: ContractDetail[] = []
    Object.entries(contractsData.contractsByType).forEach(([type, data]) => {
      data.contracts.forEach(contract => {
        allContracts.push({ ...contract, contractType: type as ContractType })
      })
    })
    return allContracts.sort((a, b) => new Date(b.signedAt).getTime() - new Date(a.signedAt).getTime())
  }

  // 種別ごとの契約を取得
  const getContractsByType = (type: ContractType | 'ALL'): ContractDetail[] => {
    if (type === 'ALL') return getAllContracts()
    if (!contractsData?.contractsByType[type]) return []
    return contractsData.contractsByType[type].contracts.map(c => ({ ...c, contractType: type }))
  }

  // 種別ごとの統計
  const getStatsByType = (type: ContractType | 'ALL') => {
    if (type === 'ALL') {
      return contractsData?.totals || { count: 0, totalAmount: 0, totalReward: 0 }
    }
    return contractsData?.contractsByType[type] || { count: 0, totalAmount: 0, totalReward: 0 }
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

          {/* 全体統計 */}
          {contractsData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総契約数</CardTitle>
                  <FileText className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-800">{contractsData.totals.count}</div>
                  <p className="text-xs text-slate-600">件</p>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総契約金額</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-800">{formatCurrency(contractsData.totals.totalAmount)}</div>
                  <p className="text-xs text-slate-600">有効契約のみ</p>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">報酬合計</CardTitle>
                  <DollarSign className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-800">{formatCurrency(contractsData.totals.totalReward)}</div>
                  <p className="text-xs text-slate-600">有効契約のみ</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 事業種別タブ */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>契約一覧</CardTitle>
              <CardDescription>事業種別ごとの契約詳細を確認できます</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
                  <TabsTrigger value="ALL" className="flex items-center gap-1">
                    <FileCheck className="h-4 w-4" />
                    全て
                    <Badge variant="secondary" className="ml-1">{contractsData?.totals.count || 0}</Badge>
                  </TabsTrigger>
                  {Object.entries(CONTRACT_TYPES).map(([key, config]) => {
                    const Icon = config.icon
                    const count = contractsData?.contractsByType[key]?.count || 0
                    return (
                      <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                        <Icon className="h-4 w-4" />
                        {config.label}
                        {count > 0 && <Badge variant="secondary" className="ml-1">{count}</Badge>}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {/* 全ての契約 */}
                <TabsContent value="ALL">
                  <ContractTable
                    contracts={getContractsByType('ALL')}
                    showType={true}
                    formatCurrency={formatCurrency}
                  />
                </TabsContent>

                {/* 種別ごとの契約 */}
                {Object.entries(CONTRACT_TYPES).map(([key, config]) => {
                  const typeContracts = getContractsByType(key as ContractType)
                  const stats = getStatsByType(key as ContractType)
                  const Icon = config.icon

                  return (
                    <TabsContent key={key} value={key}>
                      {/* 種別ごとの統計 */}
                      <div className={`${config.color} rounded-xl p-4 mb-6`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="h-6 w-6" />
                          <h3 className="text-lg font-bold">{config.label}</h3>
                        </div>
                        <p className="text-sm mb-4">{config.description}</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white/50 rounded-lg p-3 text-center">
                            <p className="text-xs font-medium">契約数</p>
                            <p className="text-xl font-bold">{stats.count}件</p>
                          </div>
                          <div className="bg-white/50 rounded-lg p-3 text-center">
                            <p className="text-xs font-medium">契約金額</p>
                            <p className="text-xl font-bold">{formatCurrency(stats.totalAmount)}</p>
                          </div>
                          <div className="bg-white/50 rounded-lg p-3 text-center">
                            <p className="text-xs font-medium">報酬額</p>
                            <p className="text-xl font-bold">{formatCurrency(stats.totalReward)}</p>
                          </div>
                        </div>
                      </div>

                      <ContractTable
                        contracts={typeContracts}
                        showType={false}
                        formatCurrency={formatCurrency}
                      />
                    </TabsContent>
                  )
                })}
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

// 契約テーブルコンポーネント
function ContractTable({
  contracts,
  showType = true,
  formatCurrency
}: {
  contracts: ContractDetail[]
  showType?: boolean
  formatCurrency: (amount: number | null) => string
}) {
  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">契約データがありません</p>
        <p className="text-sm text-slate-500 mt-2">管理者がCSVでアップロードすると、ここに表示されます</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-[140px]">
              <div className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                契約番号
              </div>
            </TableHead>
            {showType && (
              <TableHead>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  種別
                </div>
              </TableHead>
            )}
            <TableHead>
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                商品名
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                契約者名
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <DollarSign className="h-4 w-4" />
                契約金額
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <DollarSign className="h-4 w-4" />
                報酬額
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                契約日
              </div>
            </TableHead>
            <TableHead>メモ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => {
            const typeConfig = CONTRACT_TYPES[contract.contractType] || CONTRACT_TYPES.OTHER
            const Icon = typeConfig.icon

            return (
              <TableRow key={contract.id} className="hover:bg-slate-50">
                <TableCell className="font-mono text-sm font-medium">
                  {contract.contractNumber}
                </TableCell>
                {showType && (
                  <TableCell>
                    <Badge className={typeConfig.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {typeConfig.label}
                    </Badge>
                  </TableCell>
                )}
                <TableCell>{contract.productName || '-'}</TableCell>
                <TableCell>{contract.customerName || '-'}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(contract.amount)}
                </TableCell>
                <TableCell className="text-right font-medium text-orange-600">
                  {formatCurrency(contract.rewardAmount)}
                </TableCell>
                <TableCell className="text-slate-600">
                  {new Date(contract.signedAt).toLocaleDateString('ja-JP')}
                </TableCell>
                <TableCell className="text-slate-500 text-sm max-w-[150px] truncate">
                  {contract.note || '-'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
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
