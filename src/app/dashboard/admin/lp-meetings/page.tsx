'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { Calendar, Clock, Video, CheckCircle, XCircle, Loader2, Users, AlertCircle, UserX, Ban, MapPin, Building2 } from "lucide-react"
import { formatDateTime } from "@/lib/utils/format"
import { LP_MEETING_COUNSELORS } from '@/lib/constants/lp-meeting-counselors'

interface LPMeeting {
  id: string
  memberId: string
  fpId?: string | null
  counselorName?: string | null
  counselorEmail?: string | null
  status: 'REQUESTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  preferredDates: string[]
  meetingLocation?: 'OFFLINE' | 'UGS_OFFICE' | null
  scheduledAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  meetingUrl?: string | null
  meetingPlatform?: string | null
  notes?: string | null
  memberNotes?: string | null
  createdAt: string
  updatedAt: string
  member?: {
    id: string
    name: string
    email: string
  }
  fp?: {
    id: string
    name: string
    email: string
  }
}

function AdminLPMeetingsPageContent() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<LPMeeting[]>([])
  const [statistics, setStatistics] = useState({
    total: 0,
    requested: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMeeting, setSelectedMeeting] = useState<LPMeeting | null>(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'requested' | 'scheduled'>('requested')

  const [scheduleForm, setScheduleForm] = useState({
    scheduledAt: '',
    counselorEmail: '',
    meetingUrl: '',
    meetingPlatform: 'ZOOM' as 'ZOOM' | 'GOOGLE_MEET' | 'TEAMS' | 'OTHER'
  })

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchMeetings()
    }
  }, [user?.role])

  const fetchMeetings = async () => {
    try {
      const response = await fetch('/api/admin/lp-meetings', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('面談一覧の取得に失敗しました')
      }
      const data = await response.json()
      setMeetings(data.meetings || [])
      setStatistics(data.statistics || statistics)
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMeeting || !user?.id) return

    if (!scheduleForm.scheduledAt || !scheduleForm.counselorEmail || !scheduleForm.meetingUrl) {
      alert('すべての項目を入力してください')
      return
    }

    // 面談者情報を取得
    const counselor = LP_MEETING_COUNSELORS.find(c => c.email === scheduleForm.counselorEmail)
    if (!counselor) {
      alert('面談者が選択されていません')
      return
    }

    // 確認ダイアログ
    const confirmed = window.confirm(
      '面談者のスケジュールを事前におさえていますか？\nこの内容で面談を確定し、選択した面談者にメール通知を送信します。よろしいですか？'
    )
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/lp-meetings/${selectedMeeting.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          scheduledAt: scheduleForm.scheduledAt,
          counselorName: counselor.name,
          counselorEmail: counselor.email,
          meetingUrl: scheduleForm.meetingUrl,
          meetingPlatform: scheduleForm.meetingPlatform,
          assignedBy: user.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '面談の確定に失敗しました')
      }

      alert('面談を確定し、面談者にメール通知を送信しました')
      setShowScheduleForm(false)
      setSelectedMeeting(null)
      setScheduleForm({
        scheduledAt: '',
        counselorEmail: '',
        meetingUrl: '',
        meetingPlatform: 'ZOOM'
      })
      await fetchMeetings()
    } catch (error: any) {
      alert(error.message || '面談の確定に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = async (meeting: LPMeeting) => {
    const confirmed = window.confirm(
      `${meeting.member?.name}さんの面談を完了にしますか？\nこの操作を行うと、会員に完了通知が送信されます。`
    )
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/lp-meetings/${meeting.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '面談の完了処理に失敗しました')
      }

      alert('面談を完了しました。会員に完了通知が送信されました。')
      await fetchMeetings()
    } catch (error: any) {
      alert(error.message || '面談の完了処理に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async (meeting: LPMeeting) => {
    const reason = window.prompt(
      `${meeting.member?.name}さんの面談をキャンセルしますか？\nキャンセル理由を入力してください（任意）：`,
      ''
    )
    if (reason === null) return // ダイアログでキャンセルが押された

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/lp-meetings/${meeting.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason || undefined })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '面談のキャンセルに失敗しました')
      }

      alert('面談をキャンセルしました。会員と面談者に通知が送信されました。')
      await fetchMeetings()
    } catch (error: any) {
      alert(error.message || '面談のキャンセルに失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNoShow = async (meeting: LPMeeting) => {
    const confirmed = window.confirm(
      `${meeting.member?.name}さんの面談を無断欠席として処理しますか？\nこの操作を行うと、会員と面談者に通知が送信されます。`
    )
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/lp-meetings/${meeting.id}/no-show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '面談の無断欠席処理に失敗しました')
      }

      alert('面談を無断欠席として処理しました。会員と面談者に通知が送信されました。')
      await fetchMeetings()
    } catch (error: any) {
      alert(error.message || '面談の無断欠席処理に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return <Badge className="bg-yellow-100 text-yellow-800">申請中</Badge>
      case 'SCHEDULED':
        return <Badge className="bg-blue-100 text-blue-800">予約済み</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">完了</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">キャンセル</Badge>
      case 'NO_SHOW':
        return <Badge className="bg-orange-100 text-orange-800">無断欠席</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPlatformLabel = (platform: string | null | undefined) => {
    switch (platform) {
      case 'ZOOM': return 'Zoom'
      case 'GOOGLE_MEET': return 'Google Meet'
      case 'TEAMS': return 'Microsoft Teams'
      case 'OTHER': return 'その他'
      default: return '未設定'
    }
  }

  const getMeetingLocationBadge = (location: string | null | undefined) => {
    switch (location) {
      case 'UGS_OFFICE':
        return (
          <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <Building2 className="h-3 w-3" aria-hidden="true" />
            本社（オフライン）
          </Badge>
        )
      case 'OFFLINE':
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <Video className="h-3 w-3" aria-hidden="true" />
            オンライン
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600">
            未選択
          </Badge>
        )
    }
  }

  const requestedMeetings = meetings.filter(m => m.status === 'REQUESTED')
  const scheduledMeetings = meetings.filter(m => m.status === 'SCHEDULED')
  const completedMeetings = meetings.filter(m => m.status === 'COMPLETED')
  const cancelledMeetings = meetings.filter(m => m.status === 'CANCELLED')
  const noShowMeetings = meetings.filter(m => m.status === 'NO_SHOW')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="LP面談管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 統計情報 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">総数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">申請中</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{statistics.requested}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">予約済み</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{statistics.scheduled}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">完了</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{statistics.completed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">キャンセル</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{statistics.cancelled}</div>
                </CardContent>
              </Card>
            </div>

            {/* タブ */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'requested' | 'scheduled')}>
              <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                <TabsTrigger value="requested" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  申請中
                  {requestedMeetings.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800">
                      {requestedMeetings.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  予約済み
                  {scheduledMeetings.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800">
                      {scheduledMeetings.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* 申請中タブ */}
              <TabsContent value="requested" className="space-y-6 mt-6">
                {/* 申請中の面談 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" aria-hidden="true" />
                      申請中の面談 ({requestedMeetings.length}件)
                    </CardTitle>
                    <CardDescription>希望日時と面談者を選択して面談を確定してください</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {requestedMeetings.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-600">申請中の面談はありません</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {requestedMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <p className="font-medium text-slate-900 text-sm">{meeting.member?.name}</p>
                                  <span className="text-xs text-slate-500 truncate">({meeting.member?.email})</span>
                                  {getMeetingLocationBadge(meeting.meetingLocation)}
                                </div>
                                <div className="text-xs text-slate-600">
                                  <span className="font-medium">希望日時:</span>{' '}
                                  {(meeting.preferredDates as string[]).slice(0, 2).map((date, index) => (
                                    <span key={index}>
                                      {index > 0 && ' / '}
                                      {formatDateTime(new Date(date))}
                                    </span>
                                  ))}
                                  {(meeting.preferredDates as string[]).length > 2 && (
                                    <span className="text-slate-400"> 他{(meeting.preferredDates as string[]).length - 2}件</span>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedMeeting(meeting)
                                  setShowScheduleForm(true)
                                }}
                                className="flex-shrink-0"
                              >
                                確定
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 面談確定フォーム */}
                {showScheduleForm && selectedMeeting && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{selectedMeeting.member?.name}さんの面談を確定</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {getMeetingLocationBadge(selectedMeeting.meetingLocation)}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowScheduleForm(false)
                            setSelectedMeeting(null)
                          }}
                        >
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <form onSubmit={handleSchedule} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">確定日時 *</label>
                            <select
                              value={scheduleForm.scheduledAt}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-500"
                              required
                            >
                              <option value="">希望日時から選択</option>
                              {(selectedMeeting.preferredDates as string[]).map((date, index) => (
                                <option key={index} value={date}>
                                  {formatDateTime(new Date(date))}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">面談者 *</label>
                            <select
                              value={scheduleForm.counselorEmail}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, counselorEmail: e.target.value })}
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-500"
                              required
                            >
                              <option value="">面談者を選択</option>
                              {LP_MEETING_COUNSELORS.map((counselor) => (
                                <option key={counselor.email} value={counselor.email}>
                                  {counselor.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">プラットフォーム *</label>
                            <select
                              value={scheduleForm.meetingPlatform}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, meetingPlatform: e.target.value as any })}
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-500"
                              required
                            >
                              <option value="ZOOM">Zoom</option>
                              <option value="GOOGLE_MEET">Google Meet</option>
                              <option value="TEAMS">Microsoft Teams</option>
                              <option value="OTHER">その他</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">面談URL *</label>
                            <input
                              type="url"
                              value={scheduleForm.meetingUrl}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, meetingUrl: e.target.value })}
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-500"
                              placeholder="https://..."
                              required
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button type="submit" size="sm" disabled={isSubmitting}>
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                確定
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 予約済みタブ */}
              <TabsContent value="scheduled" className="space-y-6 mt-6">
                {/* 予約済み面談（アクション可能） */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
                      予約済み面談 ({scheduledMeetings.length}件)
                    </CardTitle>
                    <CardDescription>面談実施後に完了ボタンを押してください</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {scheduledMeetings.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-600">予約済みの面談はありません</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {scheduledMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className="p-3 border border-slate-200 rounded-lg"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <p className="font-medium text-slate-900 text-sm">{meeting.member?.name}</p>
                                  {getMeetingLocationBadge(meeting.meetingLocation)}
                                </div>
                                <div className="text-xs text-slate-600 space-y-0.5">
                                  {meeting.scheduledAt && (
                                    <div><span className="font-medium">日時:</span> {formatDateTime(new Date(meeting.scheduledAt))}</div>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2">
                                    {(meeting.counselorName || meeting.fp) && (
                                      <span><span className="font-medium">面談者:</span> {meeting.counselorName || meeting.fp?.name}</span>
                                    )}
                                    {meeting.meetingUrl && (
                                      <a
                                        href={meeting.meetingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline flex items-center gap-0.5"
                                      >
                                        <Video className="h-3 w-3" aria-hidden="true" />
                                        URL
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  size="sm"
                                  onClick={() => handleComplete(meeting)}
                                  disabled={isSubmitting}
                                  className="bg-green-600 hover:bg-green-700 h-7 px-2 text-xs"
                                >
                                  完了
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancel(meeting)}
                                  disabled={isSubmitting}
                                  className="text-red-600 border-red-300 hover:bg-red-50 h-7 px-2 text-xs"
                                >
                                  取消
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleNoShow(meeting)}
                                  disabled={isSubmitting}
                                  className="text-orange-600 border-orange-300 hover:bg-orange-50 h-7 px-2 text-xs"
                                >
                                  欠席
                                </Button>
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

            {/* 完了済み面談 */}
            {completedMeetings.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" aria-hidden="true" />
                    完了済み ({completedMeetings.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {completedMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-2 border border-slate-200 rounded-md text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">{meeting.member?.name}</span>
                          <span className="text-slate-500">
                            {meeting.scheduledAt && formatDateTime(new Date(meeting.scheduledAt))}
                          </span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          面談者: {meeting.counselorName || meeting.fp?.name || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* キャンセル・無断欠席済み面談 */}
            {(cancelledMeetings.length > 0 || noShowMeetings.length > 0) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <XCircle className="h-4 w-4 mr-2 text-red-600" aria-hidden="true" />
                    キャンセル・欠席 ({cancelledMeetings.length + noShowMeetings.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {[...cancelledMeetings, ...noShowMeetings].map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-2 border border-slate-200 rounded-md bg-slate-50 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-900">{meeting.member?.name}</span>
                            {getStatusBadge(meeting.status)}
                          </div>
                          <span className="text-slate-500">
                            {meeting.cancelledAt && formatDateTime(new Date(meeting.cancelledAt))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminLPMeetingsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminLPMeetingsPageContent />
    </ProtectedRoute>
  )
}

