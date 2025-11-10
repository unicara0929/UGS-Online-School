'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { LogOut, Calendar, Clock, Video, CheckCircle, XCircle, Loader2, Plus, X } from "lucide-react"
import { formatDateTime } from "@/lib/utils/format"

interface LPMeeting {
  id: string
  memberId: string
  fpId?: string | null
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

function LPMeetingRequestPageContent() {
  const { user, logout } = useAuth()
  const [meeting, setMeeting] = useState<LPMeeting | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [preferredDates, setPreferredDates] = useState<string[]>([])
  const [memberNotes, setMemberNotes] = useState('')

  useEffect(() => {
    if (user?.id) {
      fetchMeeting()
    }
  }, [user?.id])

  const fetchMeeting = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/lp-meetings/my-meeting?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('面談情報の取得に失敗しました')
      }
      const data = await response.json()
      setMeeting(data.meeting)
      if (data.meeting) {
        setShowRequestForm(false)
      } else {
        setShowRequestForm(true)
      }
    } catch (error) {
      console.error('Error fetching meeting:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addPreferredDate = () => {
    if (preferredDates.length >= 5) {
      alert('希望日時は5つまで選択できます')
      return
    }
    setPreferredDates([...preferredDates, ''])
  }

  const removePreferredDate = (index: number) => {
    setPreferredDates(preferredDates.filter((_, i) => i !== index))
  }

  const updatePreferredDate = (index: number, value: string) => {
    const updated = [...preferredDates]
    updated[index] = value
    setPreferredDates(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    if (preferredDates.length !== 5) {
      alert('希望日時を5つ選択してください')
      return
    }

    // すべての日時が入力されているか確認
    if (preferredDates.some(date => !date)) {
      alert('すべての希望日時を入力してください')
      return
    }

    // 未来の日時であることを確認
    const now = new Date()
    for (const date of preferredDates) {
      const dateObj = new Date(date)
      if (dateObj <= now) {
        alert('希望日時は未来の日時を選択してください')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/lp-meetings/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: user.id,
          preferredDates: preferredDates,
          memberNotes: memberNotes || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '面談予約申請に失敗しました')
      }

      alert('面談予約申請を送信しました。運営側で確認後、面談が確定されます。')
      await fetchMeeting()
      setPreferredDates([])
      setMemberNotes('')
    } catch (error: any) {
      alert(error.message || '面談予約申請に失敗しました')
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
        <header className="bg-white shadow-lg border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-slate-900">LP面談予約</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{user?.name}</span>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    ログアウト
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          {meeting ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    面談状況
                  </CardTitle>
                  <CardDescription>現在のLP面談の状況</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">ステータス</span>
                      {getStatusBadge(meeting.status)}
                    </div>

                    {meeting.status === 'REQUESTED' && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">希望日時（5つ）</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                          {(meeting.preferredDates as string[]).map((date, index) => (
                            <li key={index}>{formatDateTime(new Date(date))}</li>
                          ))}
                        </ul>
                        {meeting.memberNotes && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-slate-700 mb-1">要望・質問事項</p>
                            <p className="text-sm text-slate-600">{meeting.memberNotes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {meeting.status === 'SCHEDULED' && meeting.scheduledAt && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">確定日時</p>
                          <p className="text-sm text-slate-900">{formatDateTime(new Date(meeting.scheduledAt))}</p>
                        </div>
                        {meeting.fp && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-1">FPエイド</p>
                            <p className="text-sm text-slate-900">{meeting.fp.name}</p>
                          </div>
                        )}
                        {meeting.meetingUrl && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-1">オンライン面談URL</p>
                            <div className="flex items-center space-x-2">
                              <Video className="h-4 w-4 text-slate-600" />
                              <a
                                href={meeting.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {meeting.meetingUrl}
                              </a>
                            </div>
                            {meeting.meetingPlatform && (
                              <p className="text-xs text-slate-500 mt-1">
                                プラットフォーム: {getPlatformLabel(meeting.meetingPlatform)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {meeting.status === 'COMPLETED' && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">完了日時</p>
                          <p className="text-sm text-slate-900">
                            {meeting.completedAt ? formatDateTime(new Date(meeting.completedAt)) : '-'}
                          </p>
                        </div>
                        {meeting.notes && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-1">FPエイドからのメモ</p>
                            <p className="text-sm text-slate-600">{meeting.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  LP面談予約申請
                </CardTitle>
                <CardDescription>
                  FPエイド昇格の条件の一つであるLP面談の予約申請を行います
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      希望日時（5つ選択してください）*
                    </label>
                    <div className="space-y-3">
                      {preferredDates.map((date, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="datetime-local"
                            value={date}
                            onChange={(e) => updatePreferredDate(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePreferredDate(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {preferredDates.length < 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addPreferredDate}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          希望日時を追加
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {preferredDates.length}/5 選択済み
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      要望・質問事項（任意）
                    </label>
                    <textarea
                      value={memberNotes}
                      onChange={(e) => setMemberNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="面談で聞きたいことや要望があれば記入してください"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || preferredDates.length !== 5}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        申請中...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        面談予約を申請
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}

export default function LPMeetingRequestPage() {
  return (
    <ProtectedRoute requiredRoles={['member']}>
      <LPMeetingRequestPageContent />
    </ProtectedRoute>
  )
}

