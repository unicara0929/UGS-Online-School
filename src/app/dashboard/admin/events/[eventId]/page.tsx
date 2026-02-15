'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Download,
  Loader2,
  Mail,
  Search,
  Trash2,
  Users,
  Calendar,
  Clock,
  MapPin,
  FileText,
  ChevronDown,
  Filter,
  X,
} from 'lucide-react'
import Link from 'next/link'

// フィルター状態の型定義
interface ColumnFilters {
  participantType: string // 'all' | 'internal' | 'external'
  role: string // 'all' | 'MEMBER' | 'FP' | 'MANAGER'
  manager: string // 'all' | managerId | 'none'
  paymentStatus: string // 'all' | 'PAID' | 'PENDING' | 'FREE' | 'REFUNDED'
  canceled: string // 'all' | 'canceled' | 'not_canceled'
  schedule: string // 'all' | scheduleId
}

const initialFilters: ColumnFilters = {
  participantType: 'all',
  role: 'all',
  manager: 'all',
  paymentStatus: 'all',
  canceled: 'all',
  schedule: 'all',
}

// フィルタードロップダウンコンポーネント
function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isFiltered = value !== 'all'

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 text-left font-medium text-xs uppercase hover:bg-slate-100 px-2 py-1 rounded ${
          isFiltered ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
        }`}
      >
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        {isFiltered && <Filter className="h-3 w-3 text-blue-600" aria-hidden="true" />}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[140px] max-h-[300px] overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg ${
                  value === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

type RegistrationFormField = {
  id: string
  label: string
  type: string
  required: boolean
  description?: string
  options?: string[]
  placeholder?: string
}

type Participant = {
  id: string
  isExternal: boolean
  userId: string | null
  userName: string
  userEmail: string
  userRole: string
  userPhone: string | null
  managerId: string | null
  managerName: string | null
  referrer: string | null
  customFieldAnswers: Record<string, any> | null
  paymentStatus: string
  paidAmount: number | null
  registeredAt: string
  paidAt: string | null
  canceledAt: string | null
  cancelReason: string | null
  scheduleId: string | null
  scheduleDate: string | null
  scheduleTime: string | null
}

type Schedule = {
  id: string
  date: string | null
  time: string
}

type EventSummary = {
  totalCount: number
  internalCount: number
  externalCount: number
  paidCount: number
  pendingCount: number
  freeCount: number
  refundedCount: number
}

function EventDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = params.eventId as string
  const fromPage = searchParams.get('from') // 'training' など遷移元を識別

  const [event, setEvent] = useState<any>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([])
  const [summary, setSummary] = useState<EventSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // フィルター状態
  const [filters, setFilters] = useState<ColumnFilters>(initialFilters)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // メール送信関連
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([])
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTemplate, setEmailTemplate] = useState<'payment_reminder' | 'event_reminder' | 'custom'>('payment_reminder')
  const [customSubject, setCustomSubject] = useState('')
  const [customBody, setCustomBody] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // 参加者データ取得（全データを取得し、クライアントサイドでフィルタリング）
  const fetchParticipants = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/events/${eventId}/participants`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '参加者情報の取得に失敗しました')
      }

      // 全体MTGの場合は専用ページにリダイレクト
      if (data.event?.isRecurring) {
        router.replace(`/dashboard/admin/events/${eventId}/mtg`)
        return
      }

      setEvent(data.event)
      setParticipants(data.participants)
      setFilteredParticipants(data.participants)
      setSummary(data.summary)
    } catch (err) {
      console.error('Failed to fetch participants:', err)
      setError(err instanceof Error ? err.message : '参加者情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (eventId) {
      fetchParticipants()
    }
  }, [eventId])

  // フィルターが変更されたときにクライアント側でフィルタリング
  useEffect(() => {
    let result = participants

    // 検索クエリフィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.userName.toLowerCase().includes(query) ||
        p.userEmail.toLowerCase().includes(query)
      )
    }

    // 参加者種別フィルター
    if (filters.participantType !== 'all') {
      if (filters.participantType === 'internal') {
        result = result.filter(p => !p.isExternal)
      } else if (filters.participantType === 'external') {
        result = result.filter(p => p.isExternal)
      }
    }

    // ロールフィルター
    if (filters.role !== 'all') {
      result = result.filter(p => p.userRole === filters.role)
    }

    // 管轄MGRフィルター
    if (filters.manager !== 'all') {
      if (filters.manager === 'none') {
        result = result.filter(p => !p.managerId)
      } else {
        result = result.filter(p => p.managerId === filters.manager)
      }
    }

    // 支払いステータスフィルター
    if (filters.paymentStatus !== 'all') {
      result = result.filter(p => p.paymentStatus === filters.paymentStatus)
    }

    // キャンセル状態フィルター
    if (filters.canceled !== 'all') {
      if (filters.canceled === 'canceled') {
        result = result.filter(p => p.canceledAt !== null)
      } else if (filters.canceled === 'not_canceled') {
        result = result.filter(p => p.canceledAt === null)
      }
    }

    // 日程フィルター
    if (filters.schedule !== 'all') {
      result = result.filter(p => p.scheduleId === filters.schedule)
    }

    setFilteredParticipants(result)
  }, [filters, searchQuery, participants])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年M月d日(E) HH:mm', { locale: ja })
    } catch {
      return dateString
    }
  }

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return '支払い完了'
      case 'PENDING': return '支払い待ち'
      case 'FREE': return '無料'
      case 'REFUNDED': return '返金済み'
      case 'FAILED': return '失敗'
      default: return status
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-50 border-green-300 text-green-700'
      case 'PENDING': return 'bg-yellow-50 border-yellow-300 text-yellow-700'
      case 'FREE': return 'bg-blue-50 border-blue-300 text-blue-700'
      case 'REFUNDED': return 'bg-gray-50 border-gray-300 text-gray-700'
      case 'FAILED': return 'bg-red-50 border-red-300 text-red-700'
      default: return 'bg-gray-50 border-gray-300 text-gray-700'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'MEMBER': return 'UGS会員'
      case 'FP': return 'FPエイド'
      case 'MANAGER': return 'マネージャー'
      case 'ADMIN': return '管理者'
      case 'EXTERNAL': return '外部参加者'
      default: return role
    }
  }

  const handleExportCSV = () => {
    window.location.href = `/api/admin/events/${eventId}/participants/export`
  }

  // 全選択/全解除（全参加者を選択可能）
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRegIds(filteredParticipants.map(p => p.id))
    } else {
      setSelectedRegIds([])
    }
  }

  // 個別選択（registration IDベース）
  const handleSelectRegistration = (registrationId: string, checked: boolean) => {
    if (checked) {
      setSelectedRegIds(prev => [...prev, registrationId])
    } else {
      setSelectedRegIds(prev => prev.filter(id => id !== registrationId))
    }
  }

  // 選択中の参加者からメール送信可能なuserIdを取得
  const getSelectedUserIdsForEmail = () => {
    return participants
      .filter(p => selectedRegIds.includes(p.id) && p.userId)
      .map(p => p.userId!)
  }

  // 削除処理
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteRegistrations = async () => {
    if (selectedRegIds.length === 0) return

    if (!confirm(`${selectedRegIds.length}件の参加登録を削除しますか？この操作は取り消せません。`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/participants`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ registrationIds: selectedRegIds }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '削除に失敗しました')
      }

      alert(data.message)
      setSelectedRegIds([])
      fetchParticipants()
    } catch (err) {
      console.error('Failed to delete registrations:', err)
      alert(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setIsDeleting(false)
    }
  }

  // メール送信処理
  const handleSendEmail = async () => {
    const userIdsForEmail = getSelectedUserIdsForEmail()
    if (userIdsForEmail.length === 0) {
      alert('メール送信可能なユーザーが選択されていません（外部参加者にはメール送信できません）')
      return
    }

    if (emailTemplate === 'custom' && (!customSubject || !customBody)) {
      alert('カスタムメールの場合、件名と本文を入力してください')
      return
    }

    if (!confirm(`${userIdsForEmail.length}名にメールを送信しますか？`)) {
      return
    }

    setIsSendingEmail(true)

    try {
      const response = await fetch(`/api/admin/events/${eventId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds: userIdsForEmail,
          templateType: emailTemplate,
          subject: customSubject,
          customBody: customBody,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'メール送信に失敗しました')
      }

      alert(data.message)
      setShowEmailModal(false)
      setSelectedRegIds([])
      setCustomSubject('')
      setCustomBody('')
    } catch (err) {
      console.error('Failed to send email:', err)
      alert(err instanceof Error ? err.message : 'メール送信に失敗しました')
    } finally {
      setIsSendingEmail(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="イベント詳細" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center text-slate-500">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                読み込み中です
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="イベント詳細" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 戻るボタン */}
            <Button
              variant="outline"
              onClick={() => {
                // fromパラメータがあればそれを優先、なければeventCategoryを使用
                let backPath = '/dashboard/admin/events'
                if (fromPage === 'training') {
                  backPath = '/dashboard/admin/training'
                } else if (fromPage === 'mtg') {
                  backPath = '/dashboard/admin/mtg'
                } else if (event?.eventCategory === 'TRAINING') {
                  backPath = '/dashboard/admin/training'
                } else if (event?.eventCategory === 'MTG') {
                  backPath = '/dashboard/admin/mtg'
                }
                router.push(backPath)
              }}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              イベント一覧に戻る
            </Button>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p role="alert" className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* イベント情報サマリー */}
            {event && (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-2xl">{event.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/dashboard/admin/events/${eventId}/schedules`}>
                        <Button variant="outline" size="sm">
                          <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                          日程管理
                        </Button>
                      </Link>
                      <Link href={`/dashboard/admin/events/${eventId}/survey`}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                          アンケート設定
                        </Button>
                      </Link>
                      {event.isPaid && (
                        <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700">
                          ¥{event.price?.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                      {formatDate(event.date)}
                    </div>
                    {event.time && (
                      <div className="flex items-center text-sm text-slate-600">
                        <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
                        {event.time}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 参加者サマリー */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">{summary.totalCount}</div>
                      <div className="text-xs text-slate-500 mt-1">総申込数</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-700">{summary.internalCount}</div>
                      <div className="text-xs text-slate-500 mt-1">内部参加</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{summary.externalCount}</div>
                      <div className="text-xs text-slate-500 mt-1">外部参加</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{summary.paidCount}</div>
                      <div className="text-xs text-slate-500 mt-1">支払い完了</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{summary.pendingCount}</div>
                      <div className="text-xs text-slate-500 mt-1">支払い待ち</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{summary.freeCount}</div>
                      <div className="text-xs text-slate-500 mt-1">無料参加</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{summary.refundedCount}</div>
                      <div className="text-xs text-slate-500 mt-1">返金済み</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 検索・アクション */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  {/* 検索 */}
                  <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px] sm:w-auto max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="名前・メールで検索"
                      aria-label="名前・メールで検索"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>

                  {/* フィルターリセット */}
                  {(filters.participantType !== 'all' ||
                    filters.role !== 'all' ||
                    filters.manager !== 'all' ||
                    filters.paymentStatus !== 'all' ||
                    filters.canceled !== 'all' ||
                    filters.schedule !== 'all') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters(initialFilters)}
                      className="text-slate-600"
                    >
                      <X className="h-4 w-4 mr-1" aria-hidden="true" />
                      フィルター解除
                    </Button>
                  )}

                  {/* 表示件数 */}
                  <span className="text-sm text-slate-500">
                    {filteredParticipants.length} / {participants.length} 名
                  </span>

                  {/* アクションボタン */}
                  <div className="flex flex-wrap gap-2 ml-auto w-full sm:w-auto">
                    <Button
                      variant="destructive"
                      onClick={handleDeleteRegistrations}
                      disabled={selectedRegIds.length === 0 || isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                      )}
                      選択した参加者を削除 ({selectedRegIds.length})
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => setShowEmailModal(true)}
                      disabled={selectedRegIds.length === 0}
                    >
                      <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                      選択したユーザーにメール送信 ({selectedRegIds.length})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportCSV}
                      disabled={participants.length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                      CSVエクスポート
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 日程タブ（複数スケジュールがある場合のみ表示） */}
            {event?.schedules && event.schedules.length > 1 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilters({ ...filters, schedule: 'all' })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filters.schedule === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      全て ({participants.length})
                    </button>
                    {event.schedules.map((schedule: Schedule) => {
                      const count = participants.filter((p) => p.scheduleId === schedule.id).length
                      const dateStr = schedule.date
                        ? format(new Date(schedule.date), 'M/d(E)', { locale: ja })
                        : '日程未設定'
                      return (
                        <button
                          key={schedule.id}
                          onClick={() => setFilters({ ...filters, schedule: schedule.id })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filters.schedule === schedule.id
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {dateStr} {schedule.time && `${schedule.time}`} ({count})
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 参加者一覧テーブル */}
            <Card>
              <CardHeader>
                <CardTitle>
                  参加者一覧
                  {filters.schedule !== 'all' && event?.schedules && (
                    <span className="ml-2 text-base font-normal text-slate-500">
                      - {(() => {
                        const schedule = event.schedules.find((s: Schedule) => s.id === filters.schedule)
                        if (!schedule) return ''
                        const dateStr = schedule.date
                          ? format(new Date(schedule.date), 'M月d日(E)', { locale: ja })
                          : '日程未設定'
                        return `${dateStr} ${schedule.time || ''}`
                      })()}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredParticipants.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" aria-hidden="true" />
                    <p>参加者がいません</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 w-12">
                            <input
                              type="checkbox"
                              checked={selectedRegIds.length === filteredParticipants.length && filteredParticipants.length > 0}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 rounded focus:ring-slate-500"
                              title="全参加者を選択"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">名前</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">メール</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">電話番号 / 紹介者</th>
                          {event?.schedules && event.schedules.length > 1 && (
                            <th className="px-2 py-3">
                              <FilterDropdown
                                label="参加日程"
                                value={filters.schedule}
                                options={[
                                  { value: 'all', label: 'すべて' },
                                  ...event.schedules.map((s: Schedule) => ({
                                    value: s.id,
                                    label: s.date ? format(new Date(s.date), 'M/d(E)', { locale: ja }) : '日程未設定',
                                  })),
                                ]}
                                onChange={(v) => setFilters({ ...filters, schedule: v })}
                              />
                            </th>
                          )}
                          <th className="px-2 py-3">
                            <FilterDropdown
                              label="種別"
                              value={filters.participantType !== 'all' ? filters.participantType : filters.role !== 'all' ? filters.role : 'all'}
                              options={[
                                { value: 'all', label: 'すべて' },
                                { value: 'internal', label: '内部参加者' },
                                { value: 'external', label: '外部参加者' },
                                { value: 'MEMBER', label: 'UGS会員' },
                                { value: 'FP', label: 'FPエイド' },
                                { value: 'MANAGER', label: 'マネージャー' },
                              ]}
                              onChange={(v) => {
                                if (v === 'all') {
                                  setFilters({ ...filters, participantType: 'all', role: 'all' })
                                } else if (v === 'internal' || v === 'external') {
                                  setFilters({ ...filters, participantType: v, role: 'all' })
                                } else {
                                  setFilters({ ...filters, participantType: 'all', role: v })
                                }
                              }}
                            />
                          </th>
                          <th className="px-2 py-3">
                            <FilterDropdown
                              label="管轄MGR"
                              value={filters.manager}
                              options={[
                                { value: 'all', label: 'すべて' },
                                { value: 'none', label: '未設定' },
                                ...Array.from(
                                  new Map(
                                    participants
                                      .filter(p => p.managerId && p.managerName)
                                      .map(p => [p.managerId, { value: p.managerId!, label: p.managerName! }])
                                  ).values()
                                ).sort((a, b) => a.label.localeCompare(b.label, 'ja'))
                              ]}
                              onChange={(v) => setFilters({ ...filters, manager: v })}
                            />
                          </th>
                          <th className="px-2 py-3">
                            <FilterDropdown
                              label="支払い"
                              value={filters.paymentStatus}
                              options={[
                                { value: 'all', label: 'すべて' },
                                { value: 'PAID', label: '支払い完了' },
                                { value: 'PENDING', label: '支払い待ち' },
                                { value: 'FREE', label: '無料' },
                                { value: 'REFUNDED', label: '返金済み' },
                              ]}
                              onChange={(v) => setFilters({ ...filters, paymentStatus: v })}
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">申込日時</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">支払い日時</th>
                          <th className="px-2 py-3">
                            <FilterDropdown
                              label="キャンセル"
                              value={filters.canceled}
                              options={[
                                { value: 'all', label: 'すべて' },
                                { value: 'canceled', label: 'キャンセル済み' },
                                { value: 'not_canceled', label: '有効' },
                              ]}
                              onChange={(v) => setFilters({ ...filters, canceled: v })}
                            />
                          </th>
                          {event?.externalFormFields && (event.externalFormFields as RegistrationFormField[]).map((field: RegistrationFormField) => (
                            <th key={field.id} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">
                              {field.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredParticipants.map((participant) => (
                          <tr key={participant.id} className={`hover:bg-slate-50 ${participant.isExternal ? 'bg-purple-50/30' : ''}`}>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedRegIds.includes(participant.id)}
                                onChange={(e) => handleSelectRegistration(participant.id, e.target.checked)}
                                className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 rounded focus:ring-slate-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900">{participant.userName}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{participant.userEmail}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {participant.isExternal ? (
                                participant.referrer || '-'
                              ) : (
                                participant.userPhone || '-'
                              )}
                            </td>
                            {event?.schedules && event.schedules.length > 1 && (
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {participant.scheduleDate
                                  ? format(new Date(participant.scheduleDate), 'M/d(E)', { locale: ja })
                                  : '-'}
                                {participant.scheduleTime && ` ${participant.scheduleTime}`}
                              </td>
                            )}
                            <td className="px-4 py-3 text-sm">
                              {participant.isExternal ? (
                                <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
                                  外部参加者
                                </Badge>
                              ) : (
                                <Badge variant="outline">{getRoleLabel(participant.userRole)}</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {participant.userRole === 'FP' && participant.managerName
                                ? participant.managerName
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant="outline" className={getPaymentStatusColor(participant.paymentStatus)}>
                                {getPaymentStatusLabel(participant.paymentStatus)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatDate(participant.registeredAt)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {participant.paidAt ? formatDate(participant.paidAt) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {participant.canceledAt ? (
                                <div>
                                  <div className="text-red-600 text-xs">
                                    {formatDate(participant.canceledAt)}
                                  </div>
                                  {participant.cancelReason && (
                                    <div className="text-slate-600 mt-1 max-w-xs truncate" title={participant.cancelReason}>
                                      理由: {participant.cancelReason}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            {event?.externalFormFields && (event.externalFormFields as RegistrationFormField[]).map((field: RegistrationFormField) => {
                              const value = participant.isExternal ? participant.customFieldAnswers?.[field.id] : undefined
                              const displayValue = value === undefined || value === null || value === ''
                                ? '-'
                                : Array.isArray(value) ? value.join(', ') : String(value)
                              return (
                                <td key={field.id} className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                                  {displayValue}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* メール送信モーダル */}
            {showEmailModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">メール送信</h3>

                    <div className="space-y-4">
                      {/* 送信先表示 */}
                      <div>
                        <p className="text-sm text-slate-600">
                          送信先: {getSelectedUserIdsForEmail().length}名（内部参加者のみ）
                        </p>
                      </div>

                      {/* テンプレート選択 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          メールテンプレート
                        </label>
                        <select
                          value={emailTemplate}
                          onChange={(e) => setEmailTemplate(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        >
                          <option value="payment_reminder">支払いリマインド</option>
                          <option value="event_reminder">イベントリマインド</option>
                          <option value="custom">カスタムメール</option>
                        </select>
                      </div>

                      {/* テンプレートの説明 */}
                      <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                        {emailTemplate === 'payment_reminder' && (
                          <p>未払いユーザーに支払いを促すメールを送信します。</p>
                        )}
                        {emailTemplate === 'event_reminder' && (
                          <p>イベント開催のリマインドメールを送信します。</p>
                        )}
                        {emailTemplate === 'custom' && (
                          <p>カスタムメールを作成して送信します。</p>
                        )}
                      </div>

                      {/* カスタムメールの場合 */}
                      {emailTemplate === 'custom' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              件名
                            </label>
                            <input
                              type="text"
                              value={customSubject}
                              onChange={(e) => setCustomSubject(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                              placeholder="メールの件名を入力"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              本文
                            </label>
                            <textarea
                              value={customBody}
                              onChange={(e) => setCustomBody(e.target.value)}
                              rows={8}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                              placeholder="メールの本文を入力"
                            />
                          </div>
                        </>
                      )}

                      {/* ボタン */}
                      <div className="flex gap-2 justify-end pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowEmailModal(false)
                            setCustomSubject('')
                            setCustomBody('')
                          }}
                          disabled={isSendingEmail}
                        >
                          キャンセル
                        </Button>
                        <Button
                          onClick={handleSendEmail}
                          disabled={isSendingEmail}
                        >
                          {isSendingEmail ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                              送信中...
                            </>
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                              送信
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function EventDetailPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <EventDetailPageContent />
    </ProtectedRoute>
  )
}
