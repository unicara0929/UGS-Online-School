'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Award
} from "lucide-react"

interface PromotionApplication {
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

function AdminPromotionsPageContent() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<PromotionApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    setIsLoading(true)
    try {
      const response = await authenticatedFetch('/api/admin/promotions/fp')
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (applicationId: string) => {
    if (!confirm('この昇格申請を承認しますか？\n\n承認すると、ユーザーのロールがFPエイドに変更され、通知が送信されます。')) {
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

      alert('昇格申請を承認しました')
      await fetchApplications()
    } catch (error: any) {
      console.error('Error approving application:', error)
      alert(error.message || '承認に失敗しました')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (applicationId: string) => {
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

      alert('昇格申請を却下しました')
      await fetchApplications()
    } catch (error: any) {
      console.error('Error rejecting application:', error)
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

  const pendingApplications = applications.filter(app => app.status === 'PENDING')
  const processedApplications = applications.filter(app => app.status !== 'PENDING')

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
                  <p className="text-3xl font-bold text-yellow-600">{pendingApplications.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-1">承認済み</p>
                  <p className="text-3xl font-bold text-green-600">
                    {applications.filter(app => app.status === 'APPROVED' || app.status === 'COMPLETED').length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-1">却下</p>
                  <p className="text-3xl font-bold text-red-600">
                    {applications.filter(app => app.status === 'REJECTED').length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 審査待ちの申請 */}
          <Card>
            <CardHeader>
              <CardTitle>審査待ち申請</CardTitle>
              <CardDescription>
                承認または却下が必要な昇格申請
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                </div>
              ) : pendingApplications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">審査待ちの申請はありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingApplications.map((application) => (
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
                          onClick={() => handleApprove(application.id)}
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
                          onClick={() => handleReject(application.id)}
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
                承認または却下された昇格申請
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processedApplications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">処理済みの申請はありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {processedApplications.map((application) => (
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
