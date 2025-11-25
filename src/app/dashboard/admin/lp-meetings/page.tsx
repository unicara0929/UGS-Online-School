'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { Calendar, Clock, Video, CheckCircle, XCircle, Loader2, Users, AlertCircle } from "lucide-react"
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

  const requestedMeetings = meetings.filter(m => m.status === 'REQUESTED')
  const scheduledMeetings = meetings.filter(m => m.status === 'SCHEDULED')
  const completedMeetings = meetings.filter(m => m.status === 'COMPLETED')

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

            {/* 予約済み・完了済み面談 */}
            {(scheduledMeetings.length > 0 || completedMeetings.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>面談一覧</CardTitle>
                  <CardDescription>予約済み・完了済みの面談</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...scheduledMeetings, ...completedMeetings].map((meeting) => (
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
                            {meeting.completedAt && (
                              <p className="text-sm text-slate-600 mt-2">
                                完了日時: {formatDateTime(new Date(meeting.completedAt))}
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

