'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authenticatedFetch } from '@/lib/utils/api-client'
import { useAuth } from "@/contexts/auth-context"
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Calendar,
  UserPlus,
  Loader2,
  TrendingUp,
  Users as UsersIcon,
  Award
} from "lucide-react"

interface Referral {
  id: string
  referrerId: string
  referredId: string
  referralType: 'MEMBER' | 'FP'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REWARDED'
  rewardAmount: number | null
  rewardPaidAt: string | null
  createdAt: string
  updatedAt: string
  referrer: {
    id: string
    name: string
    email: string
    role: string
  }
  referred: {
    id: string
    name: string
    email: string
    role: string
    createdAt: string
  }
}

interface ReferralStats {
  total: number
  pending: number
  approved: number
  rejected: number
  rewarded: number
  byType?: {
    member: {
      total: number
      approved: number
    }
    fp: {
      total: number
      approved: number
    }
  }
}

function AdminReferralsPageContent() {
  const { user } = useAuth()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState<ReferralStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    rewarded: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    try {
      setIsLoading(true)
      const response = await authenticatedFetch('/api/admin/referrals')
      if (response.ok) {
        const data = await response.json()
        setReferrals(data.referrals || [])
        setStats(data.stats || {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          rewarded: 0
        })
      }
    } catch (error) {
      console.error('Error fetching referrals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (referralId: string) => {
    if (!confirm('この紹介を承認しますか？')) return

    setProcessingId(referralId)
    try {
      const response = await authenticatedFetch(`/api/referrals/${referralId}/approve`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchReferrals()
        alert('紹介を承認しました')
      } else {
        const data = await response.json()
        alert(data.error || '承認に失敗しました')
      }
    } catch (error) {
      console.error('Error approving referral:', error)
      alert('承認に失敗しました')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (referralId: string) => {
    if (!confirm('この紹介を却下しますか？')) return

    setProcessingId(referralId)
    try {
      const response = await authenticatedFetch(`/api/referrals/${referralId}/reject`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchReferrals()
        alert('紹介を却下しました')
      } else {
        const data = await response.json()
        alert(data.error || '却下に失敗しました')
      }
    } catch (error) {
      console.error('Error rejecting referral:', error)
      alert('却下に失敗しました')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />承認済み</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />却下</Badge>
      case 'REWARDED':
        return <Badge className="bg-blue-100 text-blue-800"><Award className="h-3 w-3 mr-1" />報酬支払済み</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />審査中</Badge>
    }
  }

  const getReferralTypeBadge = (type: string) => {
    switch (type) {
      case 'FP':
        return <Badge variant="secondary">FPエイド紹介</Badge>
      default:
        return <Badge variant="outline">UGS会員紹介</Badge>
    }
  }

  const filteredReferrals = referrals.filter(ref => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return ref.status === 'PENDING'
    if (activeTab === 'approved') return ref.status === 'APPROVED' || ref.status === 'REWARDED'
    if (activeTab === 'rejected') return ref.status === 'REJECTED'
    return true
  })

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="紹介管理（管理者）"
          />
          <p className="mt-2 text-sm text-slate-600">全ユーザーの紹介を管理します</p>

          {/* 紹介タイプ別統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-600 font-medium">紹介合計</CardDescription>
                <CardTitle className="text-3xl">{stats.total}件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-500">
                  承認済み: {stats.approved + stats.rewarded}件
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-blue-600 font-medium">FPエイド紹介</CardDescription>
                <CardTitle className="text-3xl text-blue-700">{stats.byType?.fp.total ?? 0}件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-blue-600">
                  承認済み: {stats.byType?.fp.approved ?? 0}件
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-emerald-600 font-medium">UGS会員紹介</CardDescription>
                <CardTitle className="text-3xl text-emerald-700">{stats.byType?.member.total ?? 0}件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-emerald-600">
                  承認済み: {stats.byType?.member.approved ?? 0}件
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ステータス別統計カード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>審査中</CardDescription>
                <CardTitle className="text-2xl text-yellow-600">{stats.pending}</CardTitle>
              </CardHeader>
              <CardContent>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>承認済み</CardDescription>
                <CardTitle className="text-2xl text-green-600">{stats.approved}</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>却下</CardDescription>
                <CardTitle className="text-2xl text-red-600">{stats.rejected}</CardTitle>
              </CardHeader>
              <CardContent>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>報酬支払済み</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{stats.rewarded}</CardTitle>
              </CardHeader>
              <CardContent>
                <Award className="h-4 w-4 text-blue-500" />
              </CardContent>
            </Card>
          </div>

          {/* 紹介一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>紹介一覧</CardTitle>
              <CardDescription>
                全ユーザーの紹介を確認し、承認または却下します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pending">
                    審査中 ({stats.pending})
                  </TabsTrigger>
                  <TabsTrigger value="approved">
                    承認済み ({stats.approved + stats.rewarded})
                  </TabsTrigger>
                  <TabsTrigger value="rejected">
                    却下 ({stats.rejected})
                  </TabsTrigger>
                  <TabsTrigger value="all">
                    すべて ({stats.total})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                    </div>
                  ) : filteredReferrals.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <UserPlus className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                      <p>紹介がありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredReferrals.map((referral) => (
                        <Card key={referral.id}>
                          <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              {/* 紹介者情報 */}
                              <div className="md:col-span-3">
                                <div className="text-sm text-slate-500 mb-1">紹介者</div>
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-slate-400" />
                                  <div>
                                    <div className="font-medium">{referral.referrer.name}</div>
                                    <div className="text-xs text-slate-500 flex items-center">
                                      <Mail className="h-3 w-3 mr-1" />
                                      {referral.referrer.email}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 入会者情報 */}
                              <div className="md:col-span-3">
                                <div className="text-sm text-slate-500 mb-1">入会者</div>
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-slate-400" />
                                  <div>
                                    <div className="font-medium">{referral.referred.name}</div>
                                    <div className="text-xs text-slate-500 flex items-center">
                                      <Mail className="h-3 w-3 mr-1" />
                                      {referral.referred.email}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 紹介タイプとステータス */}
                              <div className="md:col-span-3">
                                <div className="text-sm text-slate-500 mb-1">紹介タイプ</div>
                                <div className="mb-2">
                                  {getReferralTypeBadge(referral.referralType)}
                                </div>
                                <div className="text-sm text-slate-500 mb-1">ステータス</div>
                                <div>
                                  {getStatusBadge(referral.status)}
                                </div>
                              </div>

                              {/* 紹介日時とアクション */}
                              <div className="md:col-span-3">
                                <div className="text-sm text-slate-500 mb-1">紹介日時</div>
                                <div className="text-sm flex items-center mb-4">
                                  <Calendar className="h-3 w-3 mr-1 text-slate-400" />
                                  {new Date(referral.createdAt).toLocaleString('ja-JP')}
                                </div>

                                {/* アクションボタン（PENDING のみ表示） */}
                                {referral.status === 'PENDING' && (
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleApprove(referral.id)}
                                      disabled={processingId === referral.id}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {processingId === referral.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          承認
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleReject(referral.id)}
                                      disabled={processingId === referral.id}
                                    >
                                      {processingId === referral.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <XCircle className="h-4 w-4 mr-1" />
                                          却下
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function AdminReferralsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminReferralsPageContent />
    </ProtectedRoute>
  )
}
