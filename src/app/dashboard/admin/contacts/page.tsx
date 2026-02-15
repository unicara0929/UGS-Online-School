'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Inbox, Clock, User, Mail, ExternalLink } from 'lucide-react'

const CONTACT_TYPES: Record<string, string> = {
  ACCOUNT: 'アカウント',
  PAYMENT: '支払い・請求',
  CONTENT: 'コンテンツ',
  TECHNICAL: '技術的な問題',
  OTHER: 'その他',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: '未対応', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  IN_PROGRESS: { label: '対応中', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  RESOLVED: { label: '対応済み', color: 'text-green-800', bgColor: 'bg-green-100' },
  CLOSED: { label: 'クローズ', color: 'text-slate-800', bgColor: 'bg-slate-100' },
}

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'UGS会員',
  FP: 'FPエイド',
  MANAGER: 'マネージャー',
  ADMIN: '管理者',
}

interface ContactSubmission {
  id: string
  name: string
  email: string
  type: string
  subject: string | null
  message: string
  status: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface StatusCounts {
  total: number
  pending: number
  inProgress: number
  resolved: number
  closed: number
}

function AdminContactsPageContent() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [counts, setCounts] = useState<StatusCounts>({ total: 0, pending: 0, inProgress: 0, resolved: 0, closed: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterType) params.set('type', filterType)

      const response = await fetch(`/api/admin/contacts?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'お問い合わせの取得に失敗しました')
      }

      setSubmissions(data.submissions)
      setCounts(data.counts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'お問い合わせの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, filterType])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const handleStatusChange = async (submissionId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/contacts/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error)
      }

      await fetchSubmissions()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ステータスの更新に失敗しました')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="お問い合わせ管理" />
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* ヘッダー */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900">お問い合わせ管理</h2>
              <p className="text-slate-600">会員からのお問い合わせを確認・対応</p>
            </div>

            {/* ステータス別カウント */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('')}>
                <CardContent className="py-4">
                  <p className="text-2xl font-bold text-slate-800">{counts.total}</p>
                  <p className="text-sm text-slate-500">全て</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-yellow-200" onClick={() => setFilterStatus('PENDING')}>
                <CardContent className="py-4">
                  <p className="text-2xl font-bold text-yellow-600">{counts.pending}</p>
                  <p className="text-sm text-slate-500">未対応</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-blue-200" onClick={() => setFilterStatus('IN_PROGRESS')}>
                <CardContent className="py-4">
                  <p className="text-2xl font-bold text-blue-600">{counts.inProgress}</p>
                  <p className="text-sm text-slate-500">対応中</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-200" onClick={() => setFilterStatus('RESOLVED')}>
                <CardContent className="py-4">
                  <p className="text-2xl font-bold text-green-600">{counts.resolved}</p>
                  <p className="text-sm text-slate-500">対応済み</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('CLOSED')}>
                <CardContent className="py-4">
                  <p className="text-2xl font-bold text-slate-600">{counts.closed}</p>
                  <p className="text-sm text-slate-500">クローズ</p>
                </CardContent>
              </Card>
            </div>

            {/* フィルター */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="">すべて</option>
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <option key={value} value={value}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">種別</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="">すべて</option>
                      {Object.entries(CONTACT_TYPES).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p role="alert" className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* お問い合わせ一覧 */}
            <Card>
              <CardHeader>
                <CardTitle>お問い合わせ一覧</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" />
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <Inbox className="h-12 w-12 text-slate-300 mx-auto mb-4" aria-hidden="true" />
                    <p className="text-slate-500">お問い合わせはありません</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {submissions.map((submission) => (
                      <div key={submission.id} className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[submission.status]?.bgColor} ${STATUS_CONFIG[submission.status]?.color}`}>
                                {STATUS_CONFIG[submission.status]?.label || submission.status}
                              </span>
                              <Badge variant="outline">{CONTACT_TYPES[submission.type] || submission.type}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                              <User className="h-4 w-4" aria-hidden="true" />
                              <span>{submission.user.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {ROLE_LABELS[submission.user.role] || submission.user.role}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                              <Mail className="h-4 w-4" aria-hidden="true" />
                              <span>{submission.user.email}</span>
                            </div>
                            {submission.subject && (
                              <p className="font-medium text-slate-800 mb-1">{submission.subject}</p>
                            )}
                            <p className="text-sm text-slate-600 line-clamp-2">{submission.message}</p>
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              {new Date(submission.createdAt).toLocaleString('ja-JP')}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <select
                              value={submission.status}
                              onChange={(e) => handleStatusChange(submission.id, e.target.value)}
                              className="text-sm px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500"
                            >
                              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                                <option key={value} value={value}>{config.label}</option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/dashboard/admin/contacts/${submission.id}`)}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" aria-hidden="true" />
                              詳細
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminContactsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminContactsPageContent />
    </ProtectedRoute>
  )
}
