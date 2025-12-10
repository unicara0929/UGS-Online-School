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
  Calendar
} from 'lucide-react'

interface MtgParticipant {
  userId: string
  name: string
  email: string
  memberId: string | null
  status: 'not_responded' | 'registered' | 'exempted' | 'attended_code' | 'attended_video' | 'video_incomplete'
  statusLabel: string
  isRegistered: boolean
  registeredAt: string | null
  // 参加意思
  participationIntent: 'UNDECIDED' | 'WILL_ATTEND' | 'WILL_NOT_ATTEND'
  participationIntentAt: string | null
  // 出席確認
  attendanceMethod: string | null
  attendanceCompletedAt: string | null
  videoWatched: boolean
  surveyCompleted: boolean
  hasExemption: boolean
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
  attended: number
  exempted: number
  registered: number
  videoIncomplete: number
  notResponded: number
  // 参加意思
  willAttend: number
  willNotAttend: number
  undecided: number
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

          {/* サマリーカード - 参加意思 */}
          {summary && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">参加意思</p>
              <div className="grid grid-cols-3 gap-4">
                <Card className="shadow-sm bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-700">参加予定</p>
                        <p className="text-2xl font-bold text-green-700">{summary.willAttend}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-orange-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-orange-700">不参加予定</p>
                        <p className="text-2xl font-bold text-orange-700">{summary.willNotAttend}</p>
                      </div>
                      <Video className="h-8 w-8 text-orange-400" />
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

          {/* サマリーカード - 出席状況 */}
          {summary && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">出席状況</p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                <Card className="shadow-sm bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-700">出席完了</p>
                        <p className="text-2xl font-bold text-green-700">{summary.attended}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-purple-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-purple-700">免除</p>
                        <p className="text-2xl font-bold text-purple-700">{summary.exempted}</p>
                      </div>
                      <FileText className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-yellow-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-yellow-700">登録済み</p>
                        <p className="text-2xl font-bold text-yellow-700">{summary.registered}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-orange-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-orange-700">途中</p>
                        <p className="text-2xl font-bold text-orange-700">{summary.videoIncomplete}</p>
                      </div>
                      <Video className="h-8 w-8 text-orange-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-slate-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-600">未対応</p>
                        <p className="text-2xl font-bold text-slate-600">{summary.notResponded}</p>
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
                <div className="flex gap-2">
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
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>会員番号</TableHead>
                    <TableHead>名前</TableHead>
                    <TableHead>参加意思</TableHead>
                    <TableHead>出席状況</TableHead>
                    <TableHead>動画</TableHead>
                    <TableHead>アンケート</TableHead>
                    <TableHead>免除</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        該当するFPエイドがいません
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredParticipants.map((participant) => {
                      // 参加意思のバッジ
                      const getIntentBadge = () => {
                        switch (participant.participationIntent) {
                          case 'WILL_ATTEND':
                            return <Badge className="bg-green-600 text-xs">参加</Badge>
                          case 'WILL_NOT_ATTEND':
                            return <Badge className="bg-orange-600 text-xs">不参加</Badge>
                          default:
                            return <Badge variant="outline" className="text-xs text-slate-400">未回答</Badge>
                        }
                      }

                      return (
                        <TableRow key={participant.userId} className="hover:bg-slate-50">
                          <TableCell className="font-mono text-sm">
                            {participant.memberId || '-'}
                          </TableCell>
                          <TableCell className="font-medium">{participant.name || '名前未設定'}</TableCell>
                          <TableCell>
                            {getIntentBadge()}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(participant.status, participant.statusLabel)}
                          </TableCell>
                          <TableCell>
                            {participant.videoWatched ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-slate-300" />
                            )}
                          </TableCell>
                          <TableCell>
                            {participant.surveyCompleted ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-slate-300" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                            {participant.hasExemption ? (
                              <span className={participant.exemptionStatus === 'APPROVED' ? 'text-purple-600' : 'text-yellow-600'}>
                                {participant.exemptionStatus === 'APPROVED' ? '承認済' : '申請中'}
                              </span>
                            ) : '-'}
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
