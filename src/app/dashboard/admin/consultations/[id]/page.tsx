'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Clock,
  Save,
  Calendar,
  FileText,
  ExternalLink,
  Wallet,
  Home,
  Briefcase,
  Building2,
  HelpCircle,
  MessageSquare,
  Shirt,
  Sun
} from 'lucide-react'

// 相談ジャンルの設定
const CONSULTATION_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  LIFE_PLAN: { label: 'ライフプラン', icon: Wallet, color: 'text-blue-600 bg-blue-50' },
  HOUSING: { label: '住宅', icon: Home, color: 'text-green-600 bg-green-50' },
  CAREER: { label: '転職', icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
  RENTAL: { label: '賃貸', icon: Building2, color: 'text-orange-600 bg-orange-50' },
  ORDER_SUIT: { label: 'オーダースーツ作成', icon: Shirt, color: 'text-indigo-600 bg-indigo-50' },
  SOLAR_BATTERY: { label: '太陽光・蓄電池', icon: Sun, color: 'text-yellow-600 bg-yellow-50' },
  OTHER: { label: 'その他', icon: HelpCircle, color: 'text-gray-600 bg-gray-50' },
}

// ステータスの設定
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: '未対応', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  IN_PROGRESS: { label: '対応中', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  COMPLETED: { label: '完了', color: 'text-green-800', bgColor: 'bg-green-100' },
}

// 連絡方法のラベル
const CONTACT_METHOD_LABELS: Record<string, { label: string; icon: any }> = {
  EMAIL: { label: 'メール', icon: Mail },
  PHONE: { label: '電話', icon: Phone },
  LINE: { label: 'LINE', icon: MessageSquare },
}

// ロールのラベル
const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'UGS会員',
  FP: 'FPエイド',
  MANAGER: 'マネージャー',
  ADMIN: '管理者',
}

interface Consultation {
  id: string
  type: string
  typeLabel: string
  phoneNumber: string
  content: string
  preferredContact: string
  lineId: string | null
  preferredDates: string[]
  attachmentUrl: string | null
  attachmentName: string | null
  status: string
  statusLabel: string
  adminNotes: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    memberId: string
    role: string
  }
  handler: {
    id: string
    name: string
    email: string
  } | null
}

function ConsultationDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchConsultation = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/consultations/${id}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '相談の取得に失敗しました')
      }

      setConsultation(data.consultation)
      setAdminNotes(data.consultation.adminNotes || '')
      setSelectedStatus(data.consultation.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : '相談の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchConsultation()
  }, [fetchConsultation])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/consultations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: selectedStatus,
          adminNotes,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '更新に失敗しました')
      }

      await fetchConsultation()
      alert('保存しました')
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="個別相談詳細" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden="true" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !consultation) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="個別相談詳細" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4">
                <p role="alert" className="text-sm text-red-600">{error || '相談が見つかりません'}</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  const typeConfig = CONSULTATION_TYPES[consultation.type]
  const TypeIcon = typeConfig?.icon || HelpCircle
  const contactMethod = CONTACT_METHOD_LABELS[consultation.preferredContact]
  const ContactIcon = contactMethod?.icon || Mail

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="個別相談詳細" />
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 戻るボタン */}
            <Button variant="ghost" onClick={() => router.push('/dashboard/admin/consultations')}>
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              一覧に戻る
            </Button>

            {/* ステータス・基本情報 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${typeConfig?.color}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <CardTitle>{consultation.typeLabel}相談</CardTitle>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[consultation.status]?.bgColor} ${STATUS_CONFIG[consultation.status]?.color}`}>
                    {STATUS_CONFIG[consultation.status]?.label || consultation.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">申請日時</p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      {formatDate(consultation.createdAt)}
                    </p>
                  </div>
                  {consultation.completedAt && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">完了日時</p>
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        {formatDate(consultation.completedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 申請者情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">申請者情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <div>
                      <p className="text-sm text-slate-500">お名前</p>
                      <p className="font-medium">{consultation.user.name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">会員番号</p>
                    <p className="font-medium">{consultation.user.memberId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <div>
                      <p className="text-sm text-slate-500">メールアドレス</p>
                      <p className="font-medium">{consultation.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <div>
                      <p className="text-sm text-slate-500">電話番号（申請時入力）</p>
                      <p className="font-medium">{consultation.phoneNumber}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">ロール</p>
                    <Badge variant="secondary">{ROLE_LABELS[consultation.user.role] || consultation.user.role}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 相談内容 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">相談内容</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-2">内容</p>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="whitespace-pre-wrap">{consultation.content}</p>
                  </div>
                </div>

                {/* 希望連絡方法 */}
                <div>
                  <p className="text-sm text-slate-500 mb-2">希望連絡方法</p>
                  <div className="flex items-center gap-2">
                    <ContactIcon className="h-4 w-4 text-slate-600" />
                    <span className="font-medium">{contactMethod?.label}</span>
                  </div>
                  {/* LINE IDを表示（LINEの場合のみ） */}
                  {consultation.preferredContact === 'LINE' && consultation.lineId && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700">
                        <span className="font-medium">LINE ID:</span> {consultation.lineId}
                      </p>
                    </div>
                  )}
                </div>

                {/* 希望日時 */}
                <div>
                  <p className="text-sm text-slate-500 mb-2">希望日時</p>
                  <div className="space-y-2">
                    {consultation.preferredDates.map((date, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <span>{formatDate(date)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 添付ファイル */}
                {consultation.attachmentName && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">添付ファイル</p>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <FileText className="h-5 w-5 text-slate-400" aria-hidden="true" />
                      <span className="flex-1">{consultation.attachmentName}</span>
                      {consultation.attachmentUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(consultation.attachmentUrl!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" aria-hidden="true" />
                          開く
                        </Button>
                      )}
                    </div>
                  </div>
                )}
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
                  {selectedStatus === 'COMPLETED' && consultation.status !== 'COMPLETED' && (
                    <p className="text-sm text-orange-600 mt-1">
                      ※ 完了に変更すると、申請者にメールで通知されます
                    </p>
                  )}
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
                {consultation.handler && (
                  <div className="text-sm text-slate-500">
                    対応者: {consultation.handler.name}
                  </div>
                )}
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" aria-hidden="true" />
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

export default function ConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <ConsultationDetailContent params={params} />
    </ProtectedRoute>
  )
}
