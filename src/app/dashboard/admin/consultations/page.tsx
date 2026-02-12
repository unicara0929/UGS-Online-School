'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Inbox,
  Clock,
  User,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  ExternalLink,
  Wallet,
  Home,
  Briefcase,
  Building2,
  HelpCircle,
  Shirt,
  Sun
} from 'lucide-react'

// 相談ジャンルの設定
const CONSULTATION_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  LIFE_PLAN: { label: 'ライフプラン', icon: Wallet, color: 'text-blue-600' },
  HOUSING: { label: '住宅', icon: Home, color: 'text-green-600' },
  CAREER: { label: '転職', icon: Briefcase, color: 'text-purple-600' },
  RENTAL: { label: '賃貸', icon: Building2, color: 'text-orange-600' },
  ORDER_SUIT: { label: 'オーダースーツ作成', icon: Shirt, color: 'text-indigo-600' },
  SOLAR_BATTERY: { label: '太陽光・蓄電池', icon: Sun, color: 'text-yellow-600' },
  OTHER: { label: 'その他', icon: HelpCircle, color: 'text-gray-600' },
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
    memberId: string
    role: string
  }
  handler: {
    id: string
    name: string
  } | null
}

interface Stats {
  total: number
  pending: number
  inProgress: number
  completed: number
  byType: Record<string, number>
}

function AdminConsultationsPageContent() {
  const router = useRouter()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, inProgress: 0, completed: 0, byType: {} })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')

  const fetchConsultations = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterType) params.set('type', filterType)

      const response = await fetch(`/api/admin/consultations?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '相談一覧の取得に失敗しました')
      }

      setConsultations(data.consultations)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : '相談一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, filterType])

  useEffect(() => {
    fetchConsultations()
  }, [fetchConsultations])

  const handleStatusChange = async (consultationId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error)
      }

      await fetchConsultations()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ステータスの更新に失敗しました')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="個別相談管理" />
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="space-y-4 sm:space-y-6">
            {/* ヘッダー */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">個別相談管理</h2>
              <p className="text-sm sm:text-base text-slate-600">会員からの個別相談を確認・対応</p>
            </div>

            {/* ステータス別カウント */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('')}>
                <CardContent className="p-3 sm:py-4 sm:px-6">
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.total}</p>
                  <p className="text-xs sm:text-sm text-slate-500">全て</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-yellow-200" onClick={() => setFilterStatus('PENDING')}>
                <CardContent className="p-3 sm:py-4 sm:px-6">
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-xs sm:text-sm text-slate-500">未対応</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-blue-200" onClick={() => setFilterStatus('IN_PROGRESS')}>
                <CardContent className="p-3 sm:py-4 sm:px-6">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                  <p className="text-xs sm:text-sm text-slate-500">対応中</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-200" onClick={() => setFilterStatus('COMPLETED')}>
                <CardContent className="p-3 sm:py-4 sm:px-6">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed}</p>
                  <p className="text-xs sm:text-sm text-slate-500">完了</p>
                </CardContent>
              </Card>
            </div>

            {/* ジャンル別カウント */}
            <Card>
              <CardHeader className="pb-2 p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-base">ジャンル別</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {Object.entries(CONSULTATION_TYPES).map(([type, config]) => {
                    const Icon = config.icon
                    const count = stats.byType[type] || 0
                    return (
                      <Badge
                        key={type}
                        variant={filterType === type ? 'default' : 'outline'}
                        className="cursor-pointer py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm"
                        onClick={() => setFilterType(filterType === type ? '' : type)}
                      >
                        <Icon className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 ${config.color}`} />
                        {config.label}: {count}
                      </Badge>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* フィルター */}
            <Card>
              <CardContent className="p-4 sm:py-4 sm:px-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 sm:flex-none">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">ステータス</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="">すべて</option>
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <option key={value} value={value}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 sm:flex-none">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">ジャンル</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="">すべて</option>
                      {Object.entries(CONSULTATION_TYPES).map(([value, config]) => (
                        <option key={value} value={value}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* 相談一覧 */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">相談一覧</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : consultations.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Inbox className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-slate-500">相談はありません</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {consultations.map((consultation) => {
                      const typeConfig = CONSULTATION_TYPES[consultation.type]
                      const TypeIcon = typeConfig?.icon || HelpCircle
                      const contactMethod = CONTACT_METHOD_LABELS[consultation.preferredContact]
                      const ContactIcon = contactMethod?.icon || Mail

                      return (
                        <div key={consultation.id} className="py-3 sm:py-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              {/* ステータスとジャンル */}
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[consultation.status]?.bgColor} ${STATUS_CONFIG[consultation.status]?.color}`}>
                                  {STATUS_CONFIG[consultation.status]?.label || consultation.status}
                                </span>
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                  <TypeIcon className={`h-3 w-3 ${typeConfig?.color}`} />
                                  {consultation.typeLabel}
                                </Badge>
                              </div>

                              {/* ユーザー情報 */}
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 mb-1 flex-wrap">
                                <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="font-medium">{consultation.user.name}</span>
                                <span className="text-slate-400 hidden sm:inline">({consultation.user.memberId})</span>
                                <Badge variant="secondary" className="text-xs">
                                  {ROLE_LABELS[consultation.user.role] || consultation.user.role}
                                </Badge>
                              </div>

                              {/* 連絡先 */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-slate-500 mb-2">
                                <div className="flex items-center gap-1 min-w-0">
                                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="truncate">{consultation.user.email}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span>{consultation.phoneNumber}</span>
                                </div>
                              </div>

                              {/* 相談内容 */}
                              <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mb-2">{consultation.content}</p>

                              {/* 希望連絡方法と希望日時 */}
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500">
                                <div className="flex items-center gap-1">
                                  <ContactIcon className="h-3 w-3" />
                                  <span>希望: {contactMethod?.label}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>希望日時: {consultation.preferredDates.length}件</span>
                                </div>
                                {consultation.attachmentName && (
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    <span>添付あり</span>
                                  </div>
                                )}
                              </div>

                              {/* 対応者と日時 */}
                              <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400 mt-2">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(consultation.createdAt)}</span>
                                {consultation.handler && (
                                  <span className="ml-2">/ 対応: {consultation.handler.name}</span>
                                )}
                              </div>
                            </div>

                            {/* アクション */}
                            <div className="flex flex-row sm:flex-col gap-2 justify-end">
                              <select
                                value={consultation.status}
                                onChange={(e) => handleStatusChange(consultation.id, e.target.value)}
                                className="text-xs sm:text-sm px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500"
                              >
                                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                                  <option key={value} value={value}>{config.label}</option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/admin/consultations/${consultation.id}`)}
                                className="text-xs sm:text-sm"
                              >
                                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                詳細
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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

export default function AdminConsultationsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminConsultationsPageContent />
    </ProtectedRoute>
  )
}
