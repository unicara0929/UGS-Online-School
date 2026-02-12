'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, User, Mail, Clock, Save } from 'lucide-react'

const CONTACT_TYPES: Record<string, string> = {
  ACCOUNT: 'アカウントについて',
  PAYMENT: '支払い・請求について',
  CONTENT: 'コンテンツについて',
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
  adminNotes: string | null
  respondedBy: string | null
  respondedAt: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
    createdAt: string
  }
}

function ContactDetailContent({ params }: { params: Promise<{ contactId: string }> }) {
  const router = useRouter()
  const { contactId } = use(params)
  const [submission, setSubmission] = useState<ContactSubmission | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchSubmission = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/contacts/${contactId}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'お問い合わせの取得に失敗しました')
      }

      setSubmission(data.submission)
      setAdminNotes(data.submission.adminNotes || '')
      setSelectedStatus(data.submission.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'お問い合わせの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [contactId])

  useEffect(() => {
    fetchSubmission()
  }, [fetchSubmission])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: selectedStatus,
          adminNotes,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || '更新に失敗しました')
      }

      setSubmission(data.submission)
      alert('保存しました')
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="お問い合わせ詳細" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="お問い合わせ詳細" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4">
                <p className="text-sm text-red-600">{error || 'お問い合わせが見つかりません'}</p>
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
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="お問い合わせ詳細" />
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 戻るボタン */}
            <Button variant="ghost" onClick={() => router.push('/dashboard/admin/contacts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              一覧に戻る
            </Button>

            {/* ステータス・基本情報 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>お問い合わせ詳細</CardTitle>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[submission.status]?.bgColor} ${STATUS_CONFIG[submission.status]?.color}`}>
                    {STATUS_CONFIG[submission.status]?.label || submission.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">受付日時</p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {new Date(submission.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">お問い合わせ種別</p>
                    <Badge variant="outline">{CONTACT_TYPES[submission.type] || submission.type}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 送信者情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">送信者情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">お名前</p>
                      <p className="font-medium">{submission.user.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">メールアドレス</p>
                      <p className="font-medium">{submission.user.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">ロール</p>
                    <Badge variant="secondary">{ROLE_LABELS[submission.user.role] || submission.user.role}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">会員登録日</p>
                    <p>{new Date(submission.user.createdAt).toLocaleDateString('ja-JP')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* お問い合わせ内容 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">お問い合わせ内容</CardTitle>
              </CardHeader>
              <CardContent>
                {submission.subject && (
                  <div className="mb-4">
                    <p className="text-sm text-slate-500 mb-1">件名</p>
                    <p className="font-medium">{submission.subject}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500 mb-1">内容</p>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="whitespace-pre-wrap">{submission.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 管理者対応 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">対応状況</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <option key={value} value={value}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">対応メモ（管理者用）</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    rows={4}
                    placeholder="対応内容や備考を記録できます（会員には表示されません）"
                  />
                </div>
                {submission.respondedAt && (
                  <div className="text-sm text-slate-500">
                    対応完了: {new Date(submission.respondedAt).toLocaleString('ja-JP')}
                  </div>
                )}
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  保存
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function ContactDetailPage({ params }: { params: Promise<{ contactId: string }> }) {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <ContactDetailContent params={params} />
    </ProtectedRoute>
  )
}
