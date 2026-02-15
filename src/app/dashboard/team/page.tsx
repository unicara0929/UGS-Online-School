'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users, TrendingUp, FileCheck, Activity, UserCheck, ChevronRight, CheckCircle, Target } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

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
  promotionProgress?: {
    isEligible: boolean
    metCount: number
    totalConditions: number
    conditions: {
      salesTotal: { current: number; target: number; met: boolean }
      insuredCount: { current: number; target: number; met: boolean }
      memberReferrals: { current: number; target: number; met: boolean }
      fpReferrals: { current: number; target: number; met: boolean }
    }
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
  const router = useRouter()
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const handleContractClick = (member: TeamMember) => {
    router.push(`/dashboard/team/contracts/${member.id}`)
  }

  const handleMemberClick = (member: TeamMember) => {
    router.push(`/dashboard/team/members/${member.id}`)
  }

  const handleLessonsClick = (member: TeamMember) => {
    router.push(`/dashboard/team/members/${member.id}/lessons`)
  }

  // 昇格進捗のプログレスバーを描画
  const renderPromotionProgress = (progress: TeamMember['promotionProgress']) => {
    if (!progress) return <span className="text-slate-500">-</span>

    if (progress.isEligible) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
          <span className="text-green-700 font-medium text-sm">昇格可能</span>
        </div>
      )
    }

    const percentage = (progress.metCount / progress.totalConditions) * 100

    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-[width]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-slate-600 whitespace-nowrap">
          {progress.metCount}/{progress.totalConditions}
        </span>
      </div>
    )
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
        <DashboardLayout>
          <div className="p-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" aria-hidden="true" />
              <p className="text-slate-600">チーム情報を読み込み中...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={['manager', 'admin']}>
        <DashboardLayout>
          <div className="p-6">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p role="alert" className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['manager', 'admin']}>
      <DashboardLayout>
        <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">チーム管理</h1>
            <p className="text-slate-600 mt-1">
              {isManager ? '担当FPエイドの管理' : '紹介した配下メンバーの管理'}
            </p>
          </div>
          {isManager && stats && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center space-x-2">
              <UserCheck className="h-5 w-5" aria-hidden="true" />
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
                  <Users className="h-5 w-5 text-blue-600" aria-hidden="true" />
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
                  <Activity className="h-5 w-5 text-green-600" aria-hidden="true" />
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
                  <TrendingUp className="h-5 w-5 text-purple-600" aria-hidden="true" />
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
                  <FileCheck className="h-5 w-5 text-orange-600" aria-hidden="true" />
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
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" aria-hidden="true" />
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
                    {isManager && <TableHead>MGR昇格進捗</TableHead>}
                    <TableHead>サブスク状況</TableHead>
                    <TableHead className="text-right">学習進捗</TableHead>
                    <TableHead className="text-right">契約数</TableHead>
                    {isManager ? (
                      <TableHead>FP承認日</TableHead>
                    ) : (
                      <TableHead>紹介日</TableHead>
                    )}
                    {isManager && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id} className={isManager ? "hover:bg-slate-50 cursor-pointer" : ""} onClick={isManager ? () => handleMemberClick(member) : undefined}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-slate-600">{member.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </TableCell>
                      {isManager && (
                        <TableCell>
                          {renderPromotionProgress(member.promotionProgress)}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge className={getSubscriptionBadgeColor(member.subscription)}>
                          {getSubscriptionStatus(member.subscription)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLessonsClick(member); }}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                          title="クリックして視聴済みレッスンを表示"
                        >
                          {member.stats.completedLessons} レッスン
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleContractClick(member); }}
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
                      {isManager && (
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
