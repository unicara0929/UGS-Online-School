'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Users, TrendingUp, FileCheck, Activity, UserCheck, X, Building2, Home, Car, Sun, Briefcase, Shield, HelpCircle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

// 契約種別の定義
const CONTRACT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
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

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  referralType?: string
  referralCreatedAt?: string
  subscription: {
    status: string
    currentPeriodEnd: string | null
  } | null
  stats: {
    completedLessons: number
    activeContracts: number
  }
  fpStatus?: {
    lpMeetingCompleted: boolean
    basicTestCompleted: boolean
    surveyCompleted: boolean
    status: string
    approvedAt: string | null
  } | null
}

interface TeamStats {
  totalMembers: number
  activeMembers: number
  totalCompletedLessons: number
  avgCompletedLessons: number
  totalActiveContracts: number
  roleBreakdown: Record<string, number>
  referralTypeBreakdown: Record<string, number>
}

export default function TeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [contractsData, setContractsData] = useState<ContractsData | null>(null)
  const [contractsLoading, setContractsLoading] = useState(false)

  const isManager = user?.role === 'manager'

  useEffect(() => {
    fetchTeamData()
  }, [])

  const fetchTeamData = async () => {
    try {
      setIsLoading(true)

      // メンバー一覧と統計を並列で取得
      const [membersResponse, statsResponse] = await Promise.all([
        fetch('/api/team/members', { credentials: 'include' }),
        fetch('/api/team/stats', { credentials: 'include' }),
      ])

      const membersData = await membersResponse.json()
      const statsData = await statsResponse.json()

      if (!membersResponse.ok || !membersData.success) {
        throw new Error(membersData.error || 'メンバー情報の取得に失敗しました')
      }

      if (!statsResponse.ok || !statsData.success) {
        throw new Error(statsData.error || '統計情報の取得に失敗しました')
      }

      setMembers(membersData.members)
      setStats(statsData.stats)
    } catch (err) {
      console.error('Failed to fetch team data:', err)
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContractClick = async (member: TeamMember) => {
    setSelectedMember(member)
    setContractsLoading(true)
    setContractsData(null)

    try {
      const response = await fetch(`/api/team/contracts/${member.id}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setContractsData(data)
      } else {
        console.error('Failed to fetch contracts:', data.error)
      }
    } catch (err) {
      console.error('Error fetching contracts:', err)
    } finally {
      setContractsLoading(false)
    }
  }

  const closeModal = () => {
    setSelectedMember(null)
    setContractsData(null)
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-'
    return `¥${amount.toLocaleString()}`
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      MEMBER: 'UGS会員',
      FP: 'FPエイド',
      MANAGER: 'マネージャー',
      ADMIN: '管理者',
    }
    return labels[role] || role
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      MEMBER: 'bg-blue-100 text-blue-800',
      FP: 'bg-green-100 text-green-800',
      MANAGER: 'bg-purple-100 text-purple-800',
      ADMIN: 'bg-red-100 text-red-800',
    }
    return colors[role] || 'bg-slate-100 text-slate-800'
  }

  const getSubscriptionStatus = (subscription: TeamMember['subscription']) => {
    if (!subscription) return '未加入'
    if (subscription.status === 'ACTIVE') return 'アクティブ'
    if (subscription.status === 'CANCELED') return '解約済み'
    return subscription.status
  }

  const getSubscriptionBadgeColor = (subscription: TeamMember['subscription']) => {
    if (!subscription || subscription.status !== 'ACTIVE') {
      return 'bg-slate-100 text-slate-600'
    }
    return 'bg-green-100 text-green-800'
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredRoles={['manager', 'admin']}>
        <div className="min-h-screen p-6 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">チーム情報を読み込み中...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={['manager', 'admin']}>
        <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['manager', 'admin']}>
      <div className="min-h-screen p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">チーム管理</h1>
            <p className="text-slate-600 mt-1">
              {isManager ? '担当FPエイドの管理' : '紹介した配下メンバーの管理'}
            </p>
          </div>
          {isManager && stats && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center space-x-2">
              <UserCheck className="h-5 w-5" />
              <span className="font-semibold">担当FPエイド：{stats.totalMembers}名</span>
            </div>
          )}
        </div>

        {/* 統計カード */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">総メンバー数</CardTitle>
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{stats.totalMembers}</p>
                <p className="text-xs text-slate-500 mt-1">承認済み紹介</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">アクティブ会員</CardTitle>
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{stats.activeMembers}</p>
                <p className="text-xs text-slate-500 mt-1">有料サブスクリプション</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">平均学習進捗</CardTitle>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{stats.avgCompletedLessons}</p>
                <p className="text-xs text-slate-500 mt-1">レッスン完了数/人</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">契約実績</CardTitle>
                  <FileCheck className="h-5 w-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{stats.totalActiveContracts}</p>
                <p className="text-xs text-slate-500 mt-1">アクティブな契約</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* メンバー一覧 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>
              {isManager ? '担当FPエイド一覧' : 'メンバー一覧'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {members.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                {isManager ? (
                  <>
                    <p className="text-lg font-medium">現在、担当しているFPエイドは登録されていません</p>
                    <p className="text-sm mt-2">管理者によりFPエイドが割り当てられると、ここに表示されます</p>
                  </>
                ) : (
                  <>
                    <p>まだメンバーがいません</p>
                    <p className="text-sm mt-2">紹介リンクを共有して、メンバーを招待しましょう</p>
                  </>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead>ロール</TableHead>
                    <TableHead>サブスク状況</TableHead>
                    <TableHead className="text-right">学習進捗</TableHead>
                    <TableHead className="text-right">契約数</TableHead>
                    {isManager ? (
                      <TableHead>FP承認日</TableHead>
                    ) : (
                      <TableHead>紹介日</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-slate-600">{member.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSubscriptionBadgeColor(member.subscription)}>
                          {getSubscriptionStatus(member.subscription)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {member.stats.completedLessons} レッスン
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleContractClick(member)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                          title="クリックして契約詳細を表示"
                        >
                          {member.stats.activeContracts} 件
                        </button>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {isManager ? (
                          member.fpStatus?.approvedAt
                            ? new Date(member.fpStatus.approvedAt).toLocaleDateString('ja-JP')
                            : '-'
                        ) : (
                          member.referralCreatedAt
                            ? new Date(member.referralCreatedAt).toLocaleDateString('ja-JP')
                            : '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 契約詳細モーダル */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* モーダルヘッダー */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">契約詳細</h2>
                  <p className="text-slate-600">{selectedMember.name} さんの契約一覧</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeModal}
                  className="hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* モーダルコンテンツ */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {contractsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-slate-600">読み込み中...</span>
                  </div>
                ) : contractsData ? (
                  <div className="space-y-6">
                    {/* 合計サマリー */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4 text-center">
                        <p className="text-sm text-blue-600 font-medium">総契約数</p>
                        <p className="text-2xl font-bold text-blue-800">{contractsData.totals.count}件</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4 text-center">
                        <p className="text-sm text-green-600 font-medium">総契約金額</p>
                        <p className="text-2xl font-bold text-green-800">{formatCurrency(contractsData.totals.totalAmount)}</p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4 text-center">
                        <p className="text-sm text-orange-600 font-medium">総報酬額</p>
                        <p className="text-2xl font-bold text-orange-800">{formatCurrency(contractsData.totals.totalReward)}</p>
                      </div>
                    </div>

                    {/* 種別ごとの内訳 */}
                    {Object.keys(contractsData.contractsByType).length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <FileCheck className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                        <p>契約データがありません</p>
                      </div>
                    ) : (
                      Object.entries(contractsData.contractsByType).map(([type, data]) => {
                        const config = CONTRACT_TYPE_CONFIG[type] || CONTRACT_TYPE_CONFIG.OTHER
                        const Icon = config.icon

                        return (
                          <div key={type} className="border border-slate-200 rounded-xl overflow-hidden">
                            {/* 種別ヘッダー */}
                            <div className={`p-4 ${config.color} flex items-center justify-between`}>
                              <div className="flex items-center space-x-2">
                                <Icon className="h-5 w-5" />
                                <span className="font-semibold">{config.label}</span>
                                <Badge variant="secondary" className="ml-2">{data.count}件</Badge>
                              </div>
                              <div className="text-sm">
                                報酬合計: <span className="font-bold">{formatCurrency(data.totalReward)}</span>
                              </div>
                            </div>

                            {/* 契約一覧テーブル */}
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50">
                                  <TableHead className="text-xs">契約番号</TableHead>
                                  <TableHead className="text-xs">商品名</TableHead>
                                  <TableHead className="text-xs">契約者名</TableHead>
                                  <TableHead className="text-xs text-right">契約金額</TableHead>
                                  <TableHead className="text-xs text-right">報酬額</TableHead>
                                  <TableHead className="text-xs">契約日</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {data.contracts.map((contract) => (
                                  <TableRow key={contract.id} className="hover:bg-slate-50">
                                    <TableCell className="text-sm font-mono">{contract.contractNumber}</TableCell>
                                    <TableCell className="text-sm">{contract.productName || '-'}</TableCell>
                                    <TableCell className="text-sm">{contract.customerName || '-'}</TableCell>
                                    <TableCell className="text-sm text-right">{formatCurrency(contract.amount)}</TableCell>
                                    <TableCell className="text-sm text-right font-medium text-orange-600">
                                      {formatCurrency(contract.rewardAmount)}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">
                                      {new Date(contract.signedAt).toLocaleDateString('ja-JP')}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )
                      })
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>契約データの取得に失敗しました</p>
                  </div>
                )}
              </div>

              {/* モーダルフッター */}
              <div className="flex justify-end p-4 border-t border-slate-200 bg-slate-50">
                <Button onClick={closeModal} variant="outline">
                  閉じる
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
