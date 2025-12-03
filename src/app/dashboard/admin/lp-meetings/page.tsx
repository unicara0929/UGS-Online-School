'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { Calendar, Clock, Video, CheckCircle, XCircle, Loader2, Users, AlertCircle, UserX, Ban, MapPin, Building2, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { formatDateTime } from "@/lib/utils/format"
import { LP_MEETING_COUNSELORS } from '@/lib/constants/lp-meeting-counselors'

interface PreInterviewAnswer {
  id: string
  questionId: string
  value: any
}

interface PreInterviewQuestion {
  id: string
  question: string
  type: string
  required: boolean
  options?: string[]
  order: number
}

interface PreInterviewResponse {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  startedAt?: string | null
  completedAt?: string | null
  template: {
    id: string
    name: string
    questions: PreInterviewQuestion[]
  }
  answers: PreInterviewAnswer[]
}

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
  preInterviewResponse?: PreInterviewResponse | null
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
  const [expandedPreInterview, setExpandedPreInterview] = useState<string | null>(null)

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
      `${meeting.member?.name}さんの面談をノーショー（無断欠席）として処理しますか？\nこの操作を行うと、会員と面談者に通知が送信されます。`
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
        throw new Error(data.error || '面談のノーショー処理に失敗しました')
      }

      alert('面談をノーショーとして処理しました。会員と面談者に通知が送信されました。')
      await fetchMeetings()
    } catch (error: any) {
      alert(error.message || '面談のノーショー処理に失敗しました')
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
        return <Badge className="bg-orange-100 text-orange-800">ノーショー</Badge>
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
            <Building2 className="h-3 w-3" />
            本社（オフライン）
          </Badge>
        )
      case 'OFFLINE':
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <Video className="h-3 w-3" />
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

  // 事前アンケートの回答を取得するヘルパー
  const getAnswerValue = (response: PreInterviewResponse, questionId: string): string => {
    const answer = response.answers.find(a => a.questionId === questionId)
    if (!answer) return '未回答'
    if (Array.isArray(answer.value)) {
      return answer.value.join(', ')
    }
    return String(answer.value)
  }

  // 事前アンケートのステータスバッジ
  const getPreInterviewStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">回答済み</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-yellow-100 text-yellow-800">回答中</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-600">未回答</Badge>
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
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <PageHeader title="LP面談管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 統計情報 */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            {/* 申請中の面談 */}
            {requestedMeetings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                    申請中の面談 ({requestedMeetings.length}件)
                  </CardTitle>
                  <CardDescription>希望日時と面談者を選択して面談を確定してください</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {requestedMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Users className="h-4 w-4 text-slate-600" />
                              <p className="font-medium text-slate-900">{meeting.member?.name}</p>
                              <span className="text-sm text-slate-500">({meeting.member?.email})</span>
                            </div>
                            <div className="flex items-center space-x-2 mb-3">
                              <MapPin className="h-4 w-4 text-slate-600" />
                              <span className="text-sm font-medium text-slate-700">希望場所:</span>
                              {getMeetingLocationBadge(meeting.meetingLocation)}
                            </div>
                            <div className="space-y-1 mb-3">
                              <p className="text-sm font-medium text-slate-700">希望日時（5つ）</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                                {(meeting.preferredDates as string[]).map((date, index) => (
                                  <li key={index}>{formatDateTime(new Date(date))}</li>
                                ))}
                              </ul>
                            </div>
                            {meeting.memberNotes && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-slate-700 mb-1">要望・質問事項</p>
                                <p className="text-sm text-slate-600">{meeting.memberNotes}</p>
                              </div>
                            )}

                            {/* 事前アンケート回答 */}
                            {meeting.preInterviewResponse && (
                              <div className="mt-4 border-t pt-4">
                                <div
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => setExpandedPreInterview(
                                    expandedPreInterview === meeting.id ? null : meeting.id
                                  )}
                                >
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-4 w-4 text-slate-600" />
                                    <span className="text-sm font-medium text-slate-700">事前アンケート</span>
                                    {getPreInterviewStatusBadge(meeting.preInterviewResponse.status)}
                                  </div>
                                  {expandedPreInterview === meeting.id ? (
                                    <ChevronUp className="h-4 w-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                  )}
                                </div>

                                {expandedPreInterview === meeting.id && meeting.preInterviewResponse.status === 'COMPLETED' && (
                                  <div className="mt-3 space-y-3 bg-slate-50 rounded-lg p-3">
                                    {meeting.preInterviewResponse.template.questions.map((question) => (
                                      <div key={question.id} className="border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                                        <p className="text-sm font-medium text-slate-700">{question.question}</p>
                                        <p className="text-sm text-slate-600 mt-1">
                                          {getAnswerValue(meeting.preInterviewResponse!, question.id)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedMeeting(meeting)
                              setShowScheduleForm(true)
                            }}
                          >
                            面談を確定
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 面談確定フォーム */}
            {showScheduleForm && selectedMeeting && (
              <Card>
                <CardHeader>
                  <CardTitle>面談を確定</CardTitle>
                  <CardDescription>
                    {selectedMeeting.member?.name}さんの面談を確定します
                  </CardDescription>
                </CardHeader>
                <div className="px-6 pb-4">
                  <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">希望場所:</span>
                    {getMeetingLocationBadge(selectedMeeting.meetingLocation)}
                  </div>
                </div>
                <CardContent>
                  <form onSubmit={handleSchedule} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        確定日時 *
                      </label>
                      <select
                        value={scheduleForm.scheduledAt}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        面談者 *
                      </label>
                      <select
                        value={scheduleForm.counselorEmail}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, counselorEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        required
                      >
                        <option value="">面談者を選択</option>
                        {LP_MEETING_COUNSELORS.map((counselor) => (
                          <option key={counselor.email} value={counselor.email}>
                            {counselor.name} ({counselor.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        プラットフォーム *
                      </label>
                      <select
                        value={scheduleForm.meetingPlatform}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, meetingPlatform: e.target.value as any })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        required
                      >
                        <option value="ZOOM">Zoom</option>
                        <option value="GOOGLE_MEET">Google Meet</option>
                        <option value="TEAMS">Microsoft Teams</option>
                        <option value="OTHER">その他</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        オンライン面談URL *
                      </label>
                      <input
                        type="url"
                        value={scheduleForm.meetingUrl}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, meetingUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="https://..."
                        required
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            確定中...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            面談を確定
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowScheduleForm(false)
                          setSelectedMeeting(null)
                        }}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* 予約済み面談（アクション可能） */}
            {scheduledMeetings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-blue-600" />
                    予約済み面談 ({scheduledMeetings.length}件)
                  </CardTitle>
                  <CardDescription>面談実施後に完了ボタンを押してください</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scheduledMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-4 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Users className="h-4 w-4 text-slate-600" />
                              <p className="font-medium text-slate-900">{meeting.member?.name}</p>
                              {getStatusBadge(meeting.status)}
                              {getMeetingLocationBadge(meeting.meetingLocation)}
                            </div>
                            {meeting.scheduledAt && (
                              <p className="text-sm text-slate-600 mb-1">
                                確定日時: {formatDateTime(new Date(meeting.scheduledAt))}
                              </p>
                            )}
                            {(meeting.counselorName || meeting.fp) && (
                              <p className="text-sm text-slate-600 mb-1">
                                面談者: {meeting.counselorName || meeting.fp?.name}
                              </p>
                            )}
                            {meeting.meetingUrl && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Video className="h-4 w-4 text-slate-600" />
                                <a
                                  href={meeting.meetingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {meeting.meetingUrl}
                                </a>
                                <span className="text-slate-500">
                                  ({getPlatformLabel(meeting.meetingPlatform)})
                                </span>
                              </div>
                            )}

                            {/* 事前アンケート回答 */}
                            {meeting.preInterviewResponse && (
                              <div className="mt-4 border-t pt-4">
                                <div
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => setExpandedPreInterview(
                                    expandedPreInterview === meeting.id ? null : meeting.id
                                  )}
                                >
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-4 w-4 text-slate-600" />
                                    <span className="text-sm font-medium text-slate-700">事前アンケート</span>
                                    {getPreInterviewStatusBadge(meeting.preInterviewResponse.status)}
                                  </div>
                                  {expandedPreInterview === meeting.id ? (
                                    <ChevronUp className="h-4 w-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                  )}
                                </div>

                                {expandedPreInterview === meeting.id && meeting.preInterviewResponse.status === 'COMPLETED' && (
                                  <div className="mt-3 space-y-3 bg-slate-50 rounded-lg p-3">
                                    {meeting.preInterviewResponse.template.questions.map((question) => (
                                      <div key={question.id} className="border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                                        <p className="text-sm font-medium text-slate-700">{question.question}</p>
                                        <p className="text-sm text-slate-600 mt-1">
                                          {getAnswerValue(meeting.preInterviewResponse!, question.id)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col space-y-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleComplete(meeting)}
                              disabled={isSubmitting}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              完了
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(meeting)}
                              disabled={isSubmitting}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              キャンセル
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleNoShow(meeting)}
                              disabled={isSubmitting}
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              ノーショー
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 完了済み面談 */}
            {completedMeetings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    完了済み面談 ({completedMeetings.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {completedMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-4 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Users className="h-4 w-4 text-slate-600" />
                              <p className="font-medium text-slate-900">{meeting.member?.name}</p>
                              {getStatusBadge(meeting.status)}
                            </div>
                            {meeting.scheduledAt && (
                              <p className="text-sm text-slate-600 mb-1">
                                面談日時: {formatDateTime(new Date(meeting.scheduledAt))}
                              </p>
                            )}
                            {(meeting.counselorName || meeting.fp) && (
                              <p className="text-sm text-slate-600 mb-1">
                                面談者: {meeting.counselorName || meeting.fp?.name}
                              </p>
                            )}
                            {meeting.completedAt && (
                              <p className="text-sm text-slate-600">
                                完了日時: {formatDateTime(new Date(meeting.completedAt))}
                              </p>
                            )}

                            {/* 事前アンケート回答 */}
                            {meeting.preInterviewResponse && (
                              <div className="mt-4 border-t pt-4">
                                <div
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => setExpandedPreInterview(
                                    expandedPreInterview === meeting.id ? null : meeting.id
                                  )}
                                >
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-4 w-4 text-slate-600" />
                                    <span className="text-sm font-medium text-slate-700">事前アンケート</span>
                                    {getPreInterviewStatusBadge(meeting.preInterviewResponse.status)}
                                  </div>
                                  {expandedPreInterview === meeting.id ? (
                                    <ChevronUp className="h-4 w-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                  )}
                                </div>

                                {expandedPreInterview === meeting.id && meeting.preInterviewResponse.status === 'COMPLETED' && (
                                  <div className="mt-3 space-y-3 bg-slate-50 rounded-lg p-3">
                                    {meeting.preInterviewResponse.template.questions.map((question) => (
                                      <div key={question.id} className="border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                                        <p className="text-sm font-medium text-slate-700">{question.question}</p>
                                        <p className="text-sm text-slate-600 mt-1">
                                          {getAnswerValue(meeting.preInterviewResponse!, question.id)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* キャンセル・ノーショー済み面談 */}
            {(cancelledMeetings.length > 0 || noShowMeetings.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <XCircle className="h-5 w-5 mr-2 text-red-600" />
                    キャンセル・ノーショー ({cancelledMeetings.length + noShowMeetings.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...cancelledMeetings, ...noShowMeetings].map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-4 border border-slate-200 rounded-lg bg-slate-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Users className="h-4 w-4 text-slate-600" />
                              <p className="font-medium text-slate-900">{meeting.member?.name}</p>
                              {getStatusBadge(meeting.status)}
                            </div>
                            {meeting.scheduledAt && (
                              <p className="text-sm text-slate-600 mb-1">
                                面談予定日時: {formatDateTime(new Date(meeting.scheduledAt))}
                              </p>
                            )}
                            {(meeting.counselorName || meeting.fp) && (
                              <p className="text-sm text-slate-600 mb-1">
                                面談者: {meeting.counselorName || meeting.fp?.name}
                              </p>
                            )}
                            {meeting.cancelledAt && (
                              <p className="text-sm text-slate-600">
                                キャンセル日時: {formatDateTime(new Date(meeting.cancelledAt))}
                              </p>
                            )}
                            {meeting.notes && (
                              <p className="text-sm text-slate-500 mt-2">
                                備考: {meeting.notes}
                              </p>
                            )}
                          </div>
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

