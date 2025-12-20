'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Loader2,
  ArrowLeft,
  User,
  Mail,
  BookOpen,
  FileCheck,
  Calendar,
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface MemberDetail {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  subscription: {
    status: string
    currentPeriodEnd: string | null
  } | null
  stats: {
    completedLessons: number
    activeContracts: number
  }
  fpStatus: {
    lpMeetingCompleted: boolean
    basicTestCompleted: boolean
    surveyCompleted: boolean
    status: string
    approvedAt: string | null
  } | null
  manager: {
    id: string
    name: string
  } | null
  promotionEligibility: {
    isEligible: boolean
    conditions: {
      salesTotal: { current: number; target: number; met: boolean; percentage: number }
      insuredCount: { current: number; target: number; met: boolean; percentage: number }
      memberReferrals: { current: number; target: number; met: boolean; percentage: number }
      fpReferrals: { current: number; target: number; met: boolean; percentage: number }
    }
  } | null
}

export default function MemberDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMemberDetail()
  }, [resolvedParams.userId])

  const fetchMemberDetail = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/team/members/${resolvedParams.userId}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'メンバー情報の取得に失敗しました')
      }

      setMember(data.member)
    } catch (err) {
      console.error('Failed to fetch member detail:', err)
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredRoles={['manager', 'admin']}>
        <DashboardLayout>
          <div className="p-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">メンバー情報を読み込み中...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (error || !member) {
    return (
      <ProtectedRoute requiredRoles={['manager', 'admin']}>
        <DashboardLayout>
          <div className="p-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/team')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              チーム一覧に戻る
            </Button>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600">{error || 'メンバーが見つかりません'}</p>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const conditions = member.promotionEligibility?.conditions

  return (
    <ProtectedRoute requiredRoles={['manager', 'admin']}>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          {/* ヘッダー */}
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/team')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              チーム一覧に戻る
            </Button>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-slate-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{member.name}</h1>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-4 w-4" />
                    <span>{member.email}</span>
                  </div>
                </div>
              </div>
              <Badge className={`${getRoleBadgeColor(member.role)} text-sm px-3 py-1`}>
                {getRoleLabel(member.role)}
              </Badge>
            </div>
          </div>

          {/* MGR昇格条件 */}
          {member.role === 'FP' && conditions && (
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    MGR昇格条件
                  </CardTitle>
                  {member.promotionEligibility?.isEligible ? (
                    <Badge className="bg-green-100 text-green-800 px-3 py-1">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      昇格可能
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600 px-3 py-1">
                      条件未達成
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 売上合計 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {conditions.salesTotal.met ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-300" />
                      )}
                      <span className="font-medium">① 売上合計（過去6ヶ月）</span>
                    </div>
                    <span className={conditions.salesTotal.met ? 'text-green-600 font-semibold' : 'text-slate-600'}>
                      {formatCurrency(conditions.salesTotal.current)} / {formatCurrency(conditions.salesTotal.target)}
                    </span>
                  </div>
                  <Progress value={conditions.salesTotal.percentage} className="h-2" />
                </div>

                {/* 被保険者数 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {conditions.insuredCount.met ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-300" />
                      )}
                      <span className="font-medium">② 被保険者数（累計）</span>
                    </div>
                    <span className={conditions.insuredCount.met ? 'text-green-600 font-semibold' : 'text-slate-600'}>
                      {conditions.insuredCount.current}名 / {conditions.insuredCount.target}名
                    </span>
                  </div>
                  <Progress value={conditions.insuredCount.percentage} className="h-2" />
                </div>

                {/* UGS会員紹介 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {conditions.memberReferrals.met ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-300" />
                      )}
                      <span className="font-medium">③ UGS会員紹介（6ヶ月以内・維持中）</span>
                    </div>
                    <span className={conditions.memberReferrals.met ? 'text-green-600 font-semibold' : 'text-slate-600'}>
                      {conditions.memberReferrals.current}名 / {conditions.memberReferrals.target}名
                    </span>
                  </div>
                  <Progress value={conditions.memberReferrals.percentage} className="h-2" />
                </div>

                {/* FPエイド輩出 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {conditions.fpReferrals.met ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-300" />
                      )}
                      <span className="font-medium">④ FPエイド輩出（6ヶ月以内・維持中）</span>
                    </div>
                    <span className={conditions.fpReferrals.met ? 'text-green-600 font-semibold' : 'text-slate-600'}>
                      {conditions.fpReferrals.current}名 / {conditions.fpReferrals.target}名
                    </span>
                  </div>
                  <Progress value={conditions.fpReferrals.percentage} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 基本情報カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">学習進捗</p>
                    <p className="text-xl font-bold">{member.stats.completedLessons} レッスン</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">契約実績</p>
                    <p className="text-xl font-bold">{member.stats.activeContracts} 件</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">FP承認日</p>
                    <p className="text-xl font-bold">
                      {member.fpStatus?.approvedAt
                        ? new Date(member.fpStatus.approvedAt).toLocaleDateString('ja-JP')
                        : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">サブスク状態</p>
                    <p className="text-xl font-bold">
                      {member.subscription?.status === 'ACTIVE' ? 'アクティブ' : '非アクティブ'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
