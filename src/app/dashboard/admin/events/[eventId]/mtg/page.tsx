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
  Settings
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

function MtgParticipantsPageContent({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter()
  const { eventId } = use(params)
  const [event, setEvent] = useState<MtgEvent | null>(null)
  const [participants, setParticipants] = useState<MtgParticipant[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

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

  // フィルタリング
  const filteredParticipants = participants.filter(p => {
    if (filter === 'all') return true
    if (filter === 'attended') return p.status === 'attended_code' || p.status === 'attended_video'
    if (filter === 'exempted') return p.status === 'exempted'
    if (filter === 'incomplete') return p.status === 'video_incomplete'
    if (filter === 'not_responded') return p.status === 'not_responded'
    // 新規フィルター
    if (filter === 'overdue') return p.isOverdue
    if (filter === 'need_gm') return p.isOverdue && !p.gmInterviewCompleted
    if (filter === 'maintained') return p.finalApproval === 'MAINTAINED'
    if (filter === 'demoted') return p.finalApproval === 'DEMOTED'
    if (filter === 'unpaid') return p.paymentStatus === 'unpaid'
    return true
  })

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
                  <CardDescription>全FPエイドの出席状況を確認できます</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    全員
                  </Button>
                  <Button
                    variant={filter === 'attended' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('attended')}
                  >
                    出席済み
                  </Button>
                  <Button
                    variant={filter === 'exempted' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('exempted')}
                  >
                    免除
                  </Button>
                  <Button
                    variant={filter === 'incomplete' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('incomplete')}
                  >
                    途中
                  </Button>
                  <Button
                    variant={filter === 'not_responded' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('not_responded')}
                  >
                    未対応
                  </Button>
                  <Button
                    variant={filter === 'overdue' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('overdue')}
                    className={filter === 'overdue' ? '' : 'text-orange-600 border-orange-300'}
                  >
                    期限超過
                  </Button>
                  <Button
                    variant={filter === 'need_gm' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('need_gm')}
                    className={filter === 'need_gm' ? '' : 'text-red-600 border-red-300'}
                  >
                    GM面談なし
                  </Button>
                  <Button
                    variant={filter === 'demoted' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('demoted')}
                    className={filter === 'demoted' ? '' : 'text-red-600 border-red-300'}
                  >
                    降格予定
                  </Button>
                  <Button
                    variant={filter === 'maintained' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('maintained')}
                    className={filter === 'maintained' ? '' : 'text-green-600 border-green-300'}
                  >
                    維持
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>会員番号</TableHead>
                    <TableHead>名前</TableHead>
                    <TableHead>月額費</TableHead>
                    <TableHead>選択</TableHead>
                    <TableHead>正式参加</TableHead>
                    <TableHead>動画</TableHead>
                    <TableHead>アンケート</TableHead>
                    <TableHead>GM面談</TableHead>
                    <TableHead>最終承認</TableHead>
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
                            {getIntentBadge()}
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
                            <select
                              className="text-xs border rounded px-2 py-1"
                              value={participant.finalApproval || ''}
                              onChange={(e) => handleFinalApproval(participant.registrationId, participant.userId, e.target.value as 'MAINTAINED' | 'DEMOTED' | '')}
                            >
                              <option value="">未設定</option>
                              <option value="MAINTAINED">維持</option>
                              <option value="DEMOTED">降格</option>
                            </select>
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
    <ProtectedRoute requiredRoles={['admin']}>
      <MtgParticipantsPageContent params={params} />
    </ProtectedRoute>
  )
}
