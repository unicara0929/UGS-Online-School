'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  FileText,
  DollarSign,
  Loader2,
  Shield,
  Building2,
  Home,
  Sun,
  Briefcase,
  HelpCircle,
  Calendar,
  User,
  Hash,
  Package,
  FileCheck
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

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

interface Contract {
  id: string
  userId: string
  contractNumber: string
  productName: string | null
  customerName: string | null
  contractType: ContractType
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  signedAt: string
  amount: number | null
  rewardAmount: number | null
  note: string | null
  createdAt: string
}

export function ContractList() {
  const { user } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('ALL')

  useEffect(() => {
    if (user?.id) {
      fetchContracts()
    }
  }, [user?.id])

  const fetchContracts = async () => {
    if (!user?.id) return

    try {
      const response = await fetch('/api/contracts', {
        credentials: 'include'
      })
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

  // 種別ごとの契約を取得
  const getContractsByType = (type: ContractType | 'ALL') => {
    if (type === 'ALL') return contracts.filter(c => c.status === 'ACTIVE')
    return contracts.filter(c => c.contractType === type && c.status === 'ACTIVE')
  }

  // 種別ごとの統計を計算
  const getStatsByType = (type: ContractType | 'ALL') => {
    const filtered = getContractsByType(type)
    return {
      count: filtered.length,
      totalAmount: filtered.reduce((sum, c) => sum + (c.amount || 0), 0),
      totalReward: filtered.reduce((sum, c) => sum + (c.rewardAmount || 0), 0),
    }
  }

  const totalStats = getStatsByType('ALL')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 全体統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">有効契約数</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800">{totalStats.count}</div>
            <p className="text-xs text-slate-600">件</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総契約金額</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800">{formatCurrency(totalStats.totalAmount)}</div>
            <p className="text-xs text-slate-600">有効契約のみ</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">報酬合計</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-800">{formatCurrency(totalStats.totalReward)}</div>
            <p className="text-xs text-slate-600">有効契約のみ</p>
          </CardContent>
        </Card>
      </div>

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
                <Badge variant="secondary" className="ml-1">{getContractsByType('ALL').length}</Badge>
              </TabsTrigger>
              {Object.entries(CONTRACT_TYPES).map(([key, config]) => {
                const Icon = config.icon
                const count = getContractsByType(key as ContractType).length
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
                getStatusBadge={getStatusBadge}
                showType={true}
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
                    getStatusBadge={getStatusBadge}
                    showType={false}
                  />
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// 契約テーブルコンポーネント
function ContractTable({
  contracts,
  getStatusBadge,
  showType = true
}: {
  contracts: Contract[]
  getStatusBadge: (status: string) => React.ReactNode
  showType?: boolean
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
            <TableHead>ステータス</TableHead>
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
                  {contract.amount ? formatCurrency(contract.amount) : '-'}
                </TableCell>
                <TableCell className="text-right font-medium text-orange-600">
                  {contract.rewardAmount ? formatCurrency(contract.rewardAmount) : '-'}
                </TableCell>
                <TableCell className="text-slate-600">
                  {formatDate(contract.signedAt)}
                </TableCell>
                <TableCell>{getStatusBadge(contract.status)}</TableCell>
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
