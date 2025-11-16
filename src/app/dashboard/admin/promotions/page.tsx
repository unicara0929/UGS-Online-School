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
  FileText,
  Loader2,
  Award,
  TrendingUp,
  Users as UsersIcon
} from "lucide-react"

interface FPPromotionApplication {
  id: string
  userId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  lpMeetingCompleted: boolean
  basicTestCompleted: boolean
  surveyCompleted: boolean
  idDocumentUrl: string | null
  appliedAt: string
  approvedAt: string | null
  completedAt: string | null
  user: {
    name: string
    email: string
  }
}

interface ManagerPromotionApplication {
  id: string
  userId: string
  targetRole: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  appliedAt: string
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

function AdminPromotionsPageContent() {
  const { user } = useAuth()
  const [fpApplications, setFpApplications] = useState<FPPromotionApplication[]>([])
  const [managerApplications, setManagerApplications] = useState<ManagerPromotionApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'fp' | 'manager'>('fp')

  useEffect(() => {
    fetchFPApplications()
    fetchManagerApplications()
  }, [])

  const fetchFPApplications = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/promotions/fp')
      if (response.ok) {
        const data = await response.json()
        setFpApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Error fetching FP applications:', error)
    }
  }

  const fetchManagerApplications = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/promotions/manager')
      if (response.ok) {
        const data = await response.json()
        setManagerApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Error fetching Manager applications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFPApprove = async (applicationId: string) => {
    if (!confirm('このFPエイド昇格申請を承認しますか？\n\n承認すると、ユーザーのロールがFPエイドに変更され、通知が送信されます。')) {
      return
    }

    setProcessingId(applicationId)
    try {
      const response = await authenticatedFetch(`/api/admin/promotions/fp/${applicationId}/approve`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '承認に失敗しました')
      }

      alert('FPエイド昇格申請を承認しました')
      await fetchFPApplications()
    } catch (error: any) {
      console.error('Error approving FP application:', error)
      alert(error.message || '承認に失敗しました')
    } finally {
      setProcessingId(null)
    }
  }

  const handleFPReject = async (applicationId: string) => {
    const reason = prompt('却下理由を入力してください:')
    if (!reason) return

    setProcessingId(applicationId)
    try {
      const response = await authenticatedFetch(`/api/admin/promotions/fp/${applicationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '却下に失敗しました')
      }

      alert('FPエイド昇格申請を却下しました')
      await fetchFPApplications()
    } catch (error: any) {
      console.error('Error rejecting FP application:', error)
      alert(error.message || '却下に失敗しました')
    } finally {
      setProcessingId(null)
    }
  }

  const handleManagerApprove = async (applicationId: string) => {
    if (!confirm('このマネージャー昇格申請を承認しますか？\n\n承認すると、ユーザーのロールがマネージャーに変更され、通知が送信されます。')) {
      return
    }

    setProcessingId(applicationId)
    try {
      const response = await authenticatedFetch(`/api/admin/promotions/manager/${applicationId}/approve`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '承認に失敗しました')
      }

      alert('マネージャー昇格申請を承認しました')
      await fetchManagerApplications()
    } catch (error: any) {
      console.error('Error approving Manager application:', error)
      alert(error.message || '承認に失敗しました')
    } finally {
      setProcessingId(null)
    }
  }

  const handleManagerReject = async (applicationId: string) => {
    const reason = prompt('却下理由を入力してください:')
    if (!reason) return

    setProcessingId(applicationId)
    try {
      const response = await authenticatedFetch(`/api/admin/promotions/manager/${applicationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '却下に失敗しました')
      }

      alert('マネージャー昇格申請を却下しました')
      await fetchManagerApplications()
    } catch (error: any) {
      console.error('Error rejecting Manager application:', error)
      alert(error.message || '却下に失敗しました')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />審査中</Badge>
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />承認済み</Badge>
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />却下</Badge>
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800"><Award className="h-3 w-3 mr-1" />完了</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const fpPending = fpApplications.filter(app => app.status === 'PENDING')
  const fpProcessed = fpApplications.filter(app => app.status !== 'PENDING')
  const managerPending = managerApplications.filter(app => app.status === 'PENDING')
  const managerProcessed = managerApplications.filter(app => app.status !== 'PENDING')

  const allPending = fpPending.length + managerPending.length
  const allApproved = fpApplications.filter(app => app.status === 'APPROVED' || app.status === 'COMPLETED').length +
                     managerApplications.filter(app => app.status === 'APPROVED').length
  const allRejected = fpApplications.filter(app => app.status === 'REJECTED').length +
                     managerApplications.filter(app => app.status === 'REJECTED').length

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <PageHeader title="昇格申請管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-1">審査待ち</p>
                  <p className="text-3xl font-bold text-yellow-600">{allPending}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-1">承認済み</p>
                  <p className="text-3xl font-bold text-green-600">{allApproved}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-1">却下</p>
                  <p className="text-3xl font-bold text-red-600">{allRejected}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* タブ */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'fp' | 'manager')}>
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="fp" className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                FPエイド昇格
                {fpPending.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800">
                    {fpPending.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="manager" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                マネージャー昇格
                {managerPending.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800">
                    {managerPending.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* FPエイド昇格タブ */}
            <TabsContent value="fp" className="space-y-6 mt-6">
              {/* 審査待ちの申請 */}
              <Card>
                <CardHeader>
                  <CardTitle>審査待ち申請</CardTitle>
                  <CardDescription>
                    承認または却下が必要なFPエイド昇格申請
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                    </div>
                  ) : fpPending.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-600">審査待ちの申請はありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fpPending.map((application) => (
                        <div key={application.id} className="border border-slate-200 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">{application.user.name}</h3>
                                {getStatusBadge(application.status)}
                              </div>
                              <div className="space-y-1 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  <span>{application.user.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>申請日: {new Date(application.appliedAt).toLocaleDateString('ja-JP')}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                            <div className={`p-3 rounded-lg ${application.basicTestCompleted ? 'bg-green-50' : 'bg-slate-50'}`}>
                              <div className="flex items-center gap-2">
                                {application.basicTestCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-slate-400" />
                                )}
                                <span className="text-sm font-medium">基礎テスト</span>
                              </div>
                            </div>
                            <div className={`p-3 rounded-lg ${application.lpMeetingCompleted ? 'bg-green-50' : 'bg-slate-50'}`}>
                              <div className="flex items-center gap-2">
                                {application.lpMeetingCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-slate-400" />
                                )}
                                <span className="text-sm font-medium">LP面談</span>
                              </div>
                            </div>
                            <div className={`p-3 rounded-lg ${application.surveyCompleted ? 'bg-green-50' : 'bg-slate-50'}`}>
                              <div className="flex items-center gap-2">
                                {application.surveyCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-slate-400" />
                                )}
                                <span className="text-sm font-medium">アンケート</span>
                              </div>
                            </div>
                          </div>

                          {application.idDocumentUrl && (
                            <div className="mb-4">
                              <a
                                href={`/api/user/get-id-document-url?userId=${application.userId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-blue-600 hover:underline"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                身分証を確認
                              </a>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleFPApprove(application.id)}
                              disabled={processingId === application.id}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {processingId === application.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              承認
                            </Button>
                            <Button
                              onClick={() => handleFPReject(application.id)}
                              disabled={processingId === application.id}
                              variant="destructive"
                              className="flex-1"
                            >
                              {processingId === application.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              却下
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 処理済みの申請 */}
              <Card>
                <CardHeader>
                  <CardTitle>処理済み申請</CardTitle>
                  <CardDescription>
                    承認または却下されたFPエイド昇格申請
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {fpProcessed.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-600">処理済みの申請はありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fpProcessed.map((application) => (
                        <div key={application.id} className="border border-slate-200 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{application.user.name}</h3>
                                {getStatusBadge(application.status)}
                              </div>
                              <div className="space-y-1 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  <span>{application.user.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>申請日: {new Date(application.appliedAt).toLocaleDateString('ja-JP')}</span>
                                </div>
                                {application.approvedAt && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>承認日: {new Date(application.approvedAt).toLocaleDateString('ja-JP')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* マネージャー昇格タブ */}
            <TabsContent value="manager" className="space-y-6 mt-6">
              {/* 審査待ちの申請 */}
              <Card>
                <CardHeader>
                  <CardTitle>審査待ち申請</CardTitle>
                  <CardDescription>
                    承認または却下が必要なマネージャー昇格申請
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                    </div>
                  ) : managerPending.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-600">審査待ちの申請はありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {managerPending.map((application) => (
                        <div key={application.id} className="border border-slate-200 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">{application.user.name}</h3>
                                {getStatusBadge(application.status)}
                              </div>
                              <div className="space-y-1 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  <span>{application.user.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>現在のロール: {application.user.role}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>申請日: {new Date(application.appliedAt).toLocaleDateString('ja-JP')}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleManagerApprove(application.id)}
                              disabled={processingId === application.id}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {processingId === application.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              承認
                            </Button>
                            <Button
                              onClick={() => handleManagerReject(application.id)}
                              disabled={processingId === application.id}
                              variant="destructive"
                              className="flex-1"
                            >
                              {processingId === application.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              却下
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 処理済みの申請 */}
              <Card>
                <CardHeader>
                  <CardTitle>処理済み申請</CardTitle>
                  <CardDescription>
                    承認または却下されたマネージャー昇格申請
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {managerProcessed.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-600">処理済みの申請はありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {managerProcessed.map((application) => (
                        <div key={application.id} className="border border-slate-200 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{application.user.name}</h3>
                                {getStatusBadge(application.status)}
                              </div>
                              <div className="space-y-1 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  <span>{application.user.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>申請日: {new Date(application.appliedAt).toLocaleDateString('ja-JP')}</span>
                                </div>
                                {application.approvedAt && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>承認日: {new Date(application.approvedAt).toLocaleDateString('ja-JP')}</span>
                                  </div>
                                )}
                                {application.rejectedAt && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>却下日: {new Date(application.rejectedAt).toLocaleDateString('ja-JP')}</span>
                                  </div>
                                )}
                                {application.rejectionReason && (
                                  <div className="mt-2 p-2 bg-red-50 rounded text-red-800">
                                    <span className="font-medium">却下理由:</span> {application.rejectionReason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

export default function AdminPromotionsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminPromotionsPageContent />
    </ProtectedRoute>
  )
}
