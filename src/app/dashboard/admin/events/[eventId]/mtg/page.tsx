'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  ArrowLeft,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Video,
  FileText,
  AlertCircle,
  Key,
  Link as LinkIcon,
  Calendar,
  CreditCard,
  UserCheck,
  UserX,
  MessageSquare,
  Settings,
  ChevronDown,
  Filter,
  X
} from 'lucide-react'
import Link from 'next/link'

interface MtgParticipant {
  userId: string
  name: string
  email: string
  memberId: string | null
  status: 'not_responded' | 'registered' | 'exempted' | 'attended_code' | 'attended_video' | 'video_incomplete'
  statusLabel: string
  registrationId: string | null
  isRegistered: boolean
  registeredAt: string | null
  // 月額費決済ステータス
  paymentStatus: 'paid' | 'unpaid' | 'unknown'
  // 参加意思
  participationIntent: 'UNDECIDED' | 'WILL_ATTEND' | 'WILL_NOT_ATTEND'
  participationIntentAt: string | null
  // 出席確認
  attendanceMethod: string | null
  attendanceCompletedAt: string | null
  videoWatched: boolean
  videoCompletedAt: string | null
  surveyCompleted: boolean
  surveyCompletedAt: string | null
  // 期限超過・GM面談・最終承認
  isOverdue: boolean
  gmInterviewCompleted: boolean
  gmInterviewCompletedAt: string | null
  finalApproval: 'MAINTAINED' | 'DEMOTED' | null
  finalApprovalAt: string | null
  // 欠席申請
  hasExemption: boolean
  exemptionId: string | null
  exemptionStatus: string | null
  exemptionReason: string | null
}

interface MtgEvent {
  id: string
  title: string
  date: string
  time: string | null
  status: string
  hasAttendanceCode: boolean
  attendanceCode: string | null
  hasVideo: boolean
  hasSurvey: boolean
  hasMaterials: boolean
  attendanceDeadline: string | null
}

interface Summary {
  total: number
  // 正式参加
  officiallyAttended: number
  // 出席方法別
  attendedByCode: number
  attendedByVideo: number
  exemptedApproved: number
  // 選択ステータス別
  willAttend: number
  willNotAttend: number
  exemptionRequested: number
  undecided: number
  // その他
  videoIncomplete: number
  notResponded: number
  // FPエイド維持判定用
  overdue: number
  needGmInterview: number
  maintained: number
  demoted: number
  // 決済状況
  paymentPaid: number
  paymentUnpaid: number
}

// フィルター状態の型定義
interface ColumnFilters {
  payment: string // 'all' | 'paid' | 'unpaid'
  intent: string // 'all' | 'WILL_ATTEND' | 'WILL_NOT_ATTEND' | 'UNDECIDED' | 'exemption'
  official: string // 'all' | 'attended' | 'not_attended'
  video: string // 'all' | 'watched' | 'not_watched'
  survey: string // 'all' | 'completed' | 'not_completed' | 'after_datetime'
  surveyAfterDatetime: string // 指定日時以降のフィルター用
  gmInterview: string // 'all' | 'completed' | 'not_completed'
  finalApproval: string // 'all' | 'MAINTAINED' | 'DEMOTED' | 'not_set'
}

const initialFilters: ColumnFilters = {
  payment: 'all',
  intent: 'all',
  official: 'all',
  video: 'all',
  survey: 'all',
  surveyAfterDatetime: '',
  gmInterview: 'all',
  finalApproval: 'all',
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
        className={`flex items-center gap-1 text-left font-medium text-sm hover:bg-slate-100 px-2 py-1 rounded ${
          isFiltered ? 'text-blue-600 bg-blue-50' : 'text-slate-700'
        }`}
      >
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {isFiltered && <Filter className="h-3 w-3 text-blue-600" />}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[140px]">
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

// アンケート専用フィルタードロップダウン（日時指定対応）
function SurveyFilterDropdown({
  filters,
  setFilters,
}: {
  filters: ColumnFilters
  setFilters: (filters: ColumnFilters) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isFiltered = filters.survey !== 'all'

  const options = [
    { value: 'all', label: 'すべて' },
    { value: 'completed', label: '回答済' },
    { value: 'not_completed', label: '未回答' },
    { value: 'after_datetime', label: '指定日時以降' },
  ]

  const getDisplayLabel = () => {
    if (filters.survey === 'after_datetime' && filters.surveyAfterDatetime) {
      const date = new Date(filters.surveyAfterDatetime)
      return `${format(date, 'M/d HH:mm', { locale: ja })}以降`
    }
    const option = options.find(o => o.value === filters.survey)
    return option?.label || 'すべて'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 text-left font-medium text-sm hover:bg-slate-100 px-2 py-1 rounded ${
          isFiltered ? 'text-blue-600 bg-blue-50' : 'text-slate-700'
        }`}
      >
        アンケート
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {isFiltered && <Filter className="h-3 w-3 text-blue-600" />}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[200px]">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  if (option.value !== 'after_datetime') {
                    setFilters({ ...filters, survey: option.value, surveyAfterDatetime: '' })
                    setIsOpen(false)
                  } else {
                    setFilters({ ...filters, survey: option.value })
                  }
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 first:rounded-t-lg ${
                  filters.survey === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'
                } ${option.value === 'after_datetime' ? '' : 'last:rounded-b-lg'}`}
              >
                {option.label}
              </button>
            ))}
            {/* 日時指定入力 */}
            {filters.survey === 'after_datetime' && (
              <div className="px-3 py-2 border-t border-slate-200">
                <input
                  type="datetime-local"
                  value={filters.surveyAfterDatetime}
                  onChange={(e) => setFilters({ ...filters, surveyAfterDatetime: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={!filters.surveyAfterDatetime}
                  className="w-full mt-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  適用
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function MtgParticipantsPageContent({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter()
  const { eventId } = use(params)
  const [event, setEvent] = useState<MtgEvent | null>(null)
  const [participants, setParticipants] = useState<MtgParticipant[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ColumnFilters>(initialFilters)
  const [expandedReasonIds, setExpandedReasonIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [eventId])

  // GM面談完了をマーク
  const handleGmInterview = async (registrationId: string | null, userId: string) => {
    try {
      let response: Response

      if (registrationId) {
        // 既存のregistrationがある場合
        response = await fetch(`/api/admin/mtg-registrations/${registrationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'gm_interview' }),
        })
      } else {
        // registrationがない場合は新規作成
        response = await fetch('/api/admin/mtg-registrations/create-for-overdue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId, eventId, markGmInterview: true }),
        })
      }

      const data = await response.json()
      if (response.ok && data.success) {
        fetchData() // リロード
      } else {
        alert(data.error || 'GM面談の記録に失敗しました')
      }
    } catch (err) {
      console.error('Error marking GM interview:', err)
      alert('GM面談の記録中にエラーが発生しました')
    }
  }

  // 最終承認を設定
  const handleFinalApproval = async (registrationId: string | null, userId: string, approval: 'MAINTAINED' | 'DEMOTED' | '') => {
    if (!approval) return // 未設定の場合は何もしない
    try {
      let regId = registrationId

      // registrationがない場合は先に作成
      if (!regId) {
        const createRes = await fetch('/api/admin/mtg-registrations/create-for-overdue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId, eventId }),
        })
        const createData = await createRes.json()
        if (!createRes.ok || !createData.success) {
          alert(createData.error || '登録の作成に失敗しました')
          return
        }
        regId = createData.registration.id
      }

      const response = await fetch(`/api/admin/mtg-registrations/${regId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'final_approval', finalApproval: approval }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        fetchData() // リロード
      } else {
        alert(data.error || '最終承認の設定に失敗しました')
      }
    } catch (err) {
      console.error('Error setting final approval:', err)
      alert('最終承認の設定中にエラーが発生しました')
    }
  }

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/events/${eventId}/mtg-participants`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setEvent(data.event)
        setParticipants(data.participants)
        setSummary(data.summary)
      } else {
        setError(data.error || 'データの取得に失敗しました')
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('データの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年M月d日(E)', { locale: ja })
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'M/d HH:mm', { locale: ja })
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status: string, statusLabel: string) => {
    switch (status) {
      case 'attended_code':
        return <Badge className="bg-green-600">{statusLabel}</Badge>
      case 'attended_video':
        return <Badge className="bg-blue-600">{statusLabel}</Badge>
      case 'exempted':
        return <Badge className="bg-purple-600">{statusLabel}</Badge>
      case 'registered':
        return <Badge className="bg-yellow-600">{statusLabel}</Badge>
      case 'video_incomplete':
        return <Badge className="bg-orange-600">{statusLabel}</Badge>
      case 'not_responded':
        return <Badge variant="secondary">{statusLabel}</Badge>
      default:
        return <Badge variant="outline">{statusLabel}</Badge>
    }
  }

  // フィルタリング（AND条件で複数フィルターを適用）
  const filteredParticipants = participants.filter(p => {
    // 月額費フィルター
    if (filters.payment !== 'all') {
      if (filters.payment === 'paid' && p.paymentStatus !== 'paid') return false
      if (filters.payment === 'unpaid' && p.paymentStatus !== 'unpaid') return false
    }

    // 選択（参加意思）フィルター
    if (filters.intent !== 'all') {
      if (filters.intent === 'exemption') {
        if (!p.hasExemption) return false
      } else if (filters.intent === 'WILL_ATTEND') {
        if (p.participationIntent !== 'WILL_ATTEND') return false
      } else if (filters.intent === 'UNDECIDED') {
        if (p.participationIntent !== 'UNDECIDED' || p.hasExemption) return false
      }
    }

    // 正式参加フィルター
    if (filters.official !== 'all') {
      const isOfficiallyAttended = p.status === 'attended_code' || p.status === 'attended_video' ||
        (p.hasExemption && p.exemptionStatus === 'APPROVED')
      if (filters.official === 'attended' && !isOfficiallyAttended) return false
      if (filters.official === 'not_attended' && isOfficiallyAttended) return false
    }

    // 動画視聴フィルター
    if (filters.video !== 'all') {
      if (filters.video === 'watched' && !p.videoWatched) return false
      if (filters.video === 'not_watched' && p.videoWatched) return false
    }

    // アンケートフィルター
    if (filters.survey !== 'all') {
      if (filters.survey === 'completed' && !p.surveyCompleted) return false
      if (filters.survey === 'not_completed' && p.surveyCompleted) return false

      // 指定日時以降のフィルター
      if (filters.survey === 'after_datetime' && filters.surveyAfterDatetime) {
        if (!p.surveyCompleted || !p.surveyCompletedAt) return false

        const surveyDate = new Date(p.surveyCompletedAt)
        const filterDate = new Date(filters.surveyAfterDatetime)
        if (surveyDate < filterDate) return false
      }
    }

    // GM面談フィルター
    if (filters.gmInterview !== 'all') {
      if (filters.gmInterview === 'completed' && !p.gmInterviewCompleted) return false
      if (filters.gmInterview === 'not_completed' && p.gmInterviewCompleted) return false
    }

    // 最終承認フィルター
    if (filters.finalApproval !== 'all') {
      if (filters.finalApproval === 'MAINTAINED' && p.finalApproval !== 'MAINTAINED') return false
      if (filters.finalApproval === 'DEMOTED' && p.finalApproval !== 'DEMOTED') return false
      if (filters.finalApproval === 'not_set' && p.finalApproval !== null) return false
    }

    return true
  })

  // フィルターが適用されているかどうか
  const hasActiveFilters =
    filters.payment !== 'all' ||
    filters.intent !== 'all' ||
    filters.official !== 'all' ||
    filters.video !== 'all' ||
    filters.survey !== 'all' ||
    filters.gmInterview !== 'all' ||
    filters.finalApproval !== 'all'

  // フィルターをリセット
  const resetFilters = () => setFilters(initialFilters)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="全体MTG参加者管理" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-slate-600">読み込み中...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="全体MTG参加者管理" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
                <Button
                  onClick={() => router.push('/dashboard/admin/events')}
                  variant="outline"
                  className="mt-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  イベント管理に戻る
                </Button>
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
      <div className="flex-1 md:ml-64">
        <PageHeader title="全体MTG参加者管理" />
        <main className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/dashboard/admin/events')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600">全体MTG</Badge>
                  <h1 className="text-2xl font-bold text-slate-900">{event?.title}</h1>
                </div>
                <p className="text-slate-600 text-sm">
                  {event && formatDate(event.date)} {event?.time}
                </p>
              </div>
            </div>
            <Link href={`/dashboard/admin/events/${eventId}/survey`}>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                アンケート設定
              </Button>
            </Link>
          </div>

          {/* イベント情報カード */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="text-lg">イベント設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">
                    参加コード: {event?.hasAttendanceCode ? (
                      <code className="bg-slate-200 px-2 py-1 rounded font-mono">{event.attendanceCode}</code>
                    ) : (
                      <span className="text-slate-400">未設定</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">
                    動画: {event?.hasVideo ? (
                      <CheckCircle className="inline h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="inline h-4 w-4 text-slate-400" />
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">
                    アンケート: {event?.hasSurvey ? (
                      <CheckCircle className="inline h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="inline h-4 w-4 text-slate-400" />
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">
                    視聴期限: {event?.attendanceDeadline ? (
                      formatDate(event.attendanceDeadline)
                    ) : (
                      <span className="text-slate-400">未設定</span>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* サマリーカード - 正式参加状況 */}
          {summary && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">正式参加状況（FPエイド維持判定用）</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-600">FPエイド総数</p>
                        <p className="text-2xl font-bold">{summary.total}</p>
                      </div>
                      <Users className="h-8 w-8 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-green-100 border-green-300">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-800 font-semibold">正式参加</p>
                        <p className="text-2xl font-bold text-green-700">{summary.officiallyAttended}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-700">コード入力</p>
                        <p className="text-2xl font-bold text-green-700">{summary.attendedByCode}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-700">動画+アンケート</p>
                        <p className="text-2xl font-bold text-blue-700">{summary.attendedByVideo}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-purple-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-purple-700">免除承認</p>
                        <p className="text-2xl font-bold text-purple-700">{summary.exemptedApproved}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* サマリーカード - 選択ステータス */}
          {summary && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">選択ステータス</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="shadow-sm bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-700">① 参加</p>
                        <p className="text-2xl font-bold text-green-700">{summary.willAttend}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-700">② 不参加</p>
                        <p className="text-2xl font-bold text-blue-700">{summary.willNotAttend}</p>
                      </div>
                      <Video className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-purple-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-purple-700">③ 欠席申請</p>
                        <p className="text-2xl font-bold text-purple-700">{summary.exemptionRequested}</p>
                      </div>
                      <FileText className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-slate-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-600">未回答</p>
                        <p className="text-2xl font-bold text-slate-600">{summary.undecided}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* 参加者リスト */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>FPエイド参加状況</CardTitle>
                  <CardDescription>
                    全FPエイドの出席状況を確認できます（各列ヘッダーをクリックしてフィルター）
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                      className="text-slate-600"
                    >
                      <X className="h-4 w-4 mr-1" />
                      フィルター解除
                    </Button>
                  )}
                  <span className="text-sm text-slate-500">
                    {filteredParticipants.length} / {participants.length} 名
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>会員番号</TableHead>
                    <TableHead>名前</TableHead>
                    <TableHead className="p-1">
                      <FilterDropdown
                        label="月額費"
                        value={filters.payment}
                        options={[
                          { value: 'all', label: 'すべて' },
                          { value: 'paid', label: '済' },
                          { value: 'unpaid', label: '未' },
                        ]}
                        onChange={(v) => setFilters({ ...filters, payment: v })}
                      />
                    </TableHead>
                    <TableHead className="p-1">
                      <FilterDropdown
                        label="選択"
                        value={filters.intent}
                        options={[
                          { value: 'all', label: 'すべて' },
                          { value: 'WILL_ATTEND', label: '参加' },
                          { value: 'exemption', label: '欠席申請' },
                          { value: 'UNDECIDED', label: '未回答' },
                        ]}
                        onChange={(v) => setFilters({ ...filters, intent: v })}
                      />
                    </TableHead>
                    <TableHead className="p-1">
                      <FilterDropdown
                        label="正式参加"
                        value={filters.official}
                        options={[
                          { value: 'all', label: 'すべて' },
                          { value: 'attended', label: '参加済' },
                          { value: 'not_attended', label: '未参加' },
                        ]}
                        onChange={(v) => setFilters({ ...filters, official: v })}
                      />
                    </TableHead>
                    <TableHead className="p-1">
                      <FilterDropdown
                        label="動画"
                        value={filters.video}
                        options={[
                          { value: 'all', label: 'すべて' },
                          { value: 'watched', label: '視聴済' },
                          { value: 'not_watched', label: '未視聴' },
                        ]}
                        onChange={(v) => setFilters({ ...filters, video: v })}
                      />
                    </TableHead>
                    <TableHead className="p-1">
                      <SurveyFilterDropdown
                        filters={filters}
                        setFilters={setFilters}
                      />
                    </TableHead>
                    <TableHead className="p-1">
                      <FilterDropdown
                        label="GM面談"
                        value={filters.gmInterview}
                        options={[
                          { value: 'all', label: 'すべて' },
                          { value: 'completed', label: '済' },
                          { value: 'not_completed', label: '未' },
                        ]}
                        onChange={(v) => setFilters({ ...filters, gmInterview: v })}
                      />
                    </TableHead>
                    <TableHead className="p-1">
                      <FilterDropdown
                        label="最終承認"
                        value={filters.finalApproval}
                        options={[
                          { value: 'all', label: 'すべて' },
                          { value: 'MAINTAINED', label: '維持' },
                          { value: 'DEMOTED', label: '降格' },
                          { value: 'not_set', label: '未設定' },
                        ]}
                        onChange={(v) => setFilters({ ...filters, finalApproval: v })}
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                        該当するFPエイドがいません
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredParticipants.map((participant) => {
                      // 選択ステータスのバッジ（参加/不参加/欠席申請/未回答）
                      const getIntentBadge = () => {
                        // 欠席申請がある場合は欠席申請を優先表示
                        if (participant.hasExemption) {
                          return <Badge className="bg-purple-600 text-xs">欠席申請</Badge>
                        }
                        switch (participant.participationIntent) {
                          case 'WILL_ATTEND':
                            return <Badge className="bg-green-600 text-xs">参加</Badge>
                          case 'WILL_NOT_ATTEND':
                            return <Badge className="bg-blue-600 text-xs">不参加</Badge>
                          default:
                            return <Badge variant="outline" className="text-xs text-slate-400">未回答</Badge>
                        }
                      }

                      // 正式参加の判定
                      // - 参加選択 → コード入力で正式参加
                      // - 不参加選択 → 動画+アンケート完了で正式参加
                      // - 免除申請 → 承認で正式参加扱い
                      const isOfficiallyAttended = () => {
                        if (participant.status === 'attended_code') {
                          return { attended: true, method: 'コード入力' }
                        }
                        if (participant.status === 'attended_video') {
                          return { attended: true, method: '動画+アンケート' }
                        }
                        if (participant.hasExemption && participant.exemptionStatus === 'APPROVED') {
                          return { attended: true, method: '免除承認' }
                        }
                        return { attended: false, method: null }
                      }
                      const officialStatus = isOfficiallyAttended()

                      return (
                        <TableRow key={participant.userId} className={`hover:bg-slate-50 ${participant.isOverdue ? 'bg-orange-50' : ''}`}>
                          <TableCell className="font-mono text-sm">
                            {participant.memberId || '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              {participant.name || '名前未設定'}
                              {participant.isOverdue && (
                                <Badge className="bg-orange-500 text-xs">期限超過</Badge>
                              )}
                            </div>
                          </TableCell>
                          {/* 月額費決済 */}
                          <TableCell>
                            {participant.paymentStatus === 'paid' ? (
                              <Badge className="bg-green-100 text-green-700 border-green-300">済</Badge>
                            ) : participant.paymentStatus === 'unpaid' ? (
                              <Badge className="bg-red-100 text-red-700 border-red-300">未</Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400">-</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getIntentBadge()}
                              {participant.hasExemption && participant.exemptionReason && (
                                <button
                                  onClick={() => {
                                    const newSet = new Set(expandedReasonIds)
                                    if (newSet.has(participant.exemptionId!)) {
                                      newSet.delete(participant.exemptionId!)
                                    } else {
                                      newSet.add(participant.exemptionId!)
                                    }
                                    setExpandedReasonIds(newSet)
                                  }}
                                  className={`text-xs text-left text-slate-600 hover:text-slate-900 ${
                                    expandedReasonIds.has(participant.exemptionId!)
                                      ? 'max-w-[300px] whitespace-pre-wrap'
                                      : 'max-w-[150px] truncate'
                                  }`}
                                >
                                  理由: {participant.exemptionReason}
                                  {!expandedReasonIds.has(participant.exemptionId!) && (
                                    <span className="text-blue-500 ml-1">▼</span>
                                  )}
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {officialStatus.attended ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-xs text-green-700">{officialStatus.method}</span>
                              </div>
                            ) : (
                              <XCircle className="h-5 w-5 text-slate-300" />
                            )}
                          </TableCell>
                          <TableCell>
                            {participant.videoWatched ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-slate-300" />
                            )}
                          </TableCell>
                          {/* アンケート提出日時 */}
                          <TableCell className="text-xs">
                            {participant.surveyCompleted ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                {participant.surveyCompletedAt && (
                                  <span className="text-slate-500">
                                    {formatDateTime(participant.surveyCompletedAt)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <XCircle className="h-5 w-5 text-slate-300" />
                            )}
                          </TableCell>
                          {/* GM面談 */}
                          <TableCell>
                            {participant.gmInterviewCompleted ? (
                              <Badge className="bg-green-100 text-green-700 border-green-300">済</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 text-orange-600 border-orange-300 hover:bg-orange-50"
                                onClick={() => handleGmInterview(participant.registrationId, participant.userId)}
                              >
                                面談済
                              </Button>
                            )}
                          </TableCell>
                          {/* 最終承認 */}
                          <TableCell>
                            {(() => {
                              // 正式参加者はデフォルトで維持、それ以外は設定値またはundefined
                              const effectiveApproval = officialStatus.attended && !participant.finalApproval
                                ? 'MAINTAINED'
                                : participant.finalApproval
                              return (
                                <select
                                  className={`text-xs border rounded px-2 py-1 font-semibold ${
                                    effectiveApproval === 'MAINTAINED'
                                      ? 'bg-green-100 text-green-700 border-green-300'
                                      : effectiveApproval === 'DEMOTED'
                                      ? 'bg-red-100 text-red-700 border-red-300'
                                      : 'bg-white text-slate-600'
                                  }`}
                                  value={effectiveApproval || ''}
                                  onChange={(e) => handleFinalApproval(participant.registrationId, participant.userId, e.target.value as 'MAINTAINED' | 'DEMOTED' | '')}
                                >
                                  <option value="">未設定</option>
                                  <option value="MAINTAINED">維持</option>
                                  <option value="DEMOTED">降格</option>
                                </select>
                              )
                            })()}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

export default function MtgParticipantsPage({ params }: { params: Promise<{ eventId: string }> }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <MtgParticipantsPageContent params={params} />
    </ProtectedRoute>
  )
}
