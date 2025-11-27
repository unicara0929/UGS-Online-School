'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { Calendar, Clock, Video, CheckCircle, Loader2, Users, MessageSquare, ClipboardList, ChevronDown, ChevronUp } from "lucide-react"
import { formatDateTime } from "@/lib/utils/format"

interface PreInterviewAnswer {
  questionId: string
  value: any
}

interface PreInterviewQuestion {
  id: string
  order: number
  category: string | null
  question: string
  type: string
  options: string[] | null
}

interface PreInterviewResponse {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  completedAt: string | null
  template: {
    name: string
    questions: PreInterviewQuestion[]
  }
  answers: PreInterviewAnswer[]
}

interface LPMeeting {
  id: string
  memberId: string
  fpId?: string | null
  status: 'REQUESTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  scheduledAt?: string | null
  completedAt?: string | null
  meetingUrl?: string | null
  meetingPlatform?: string | null
  notes?: string | null
  memberNotes?: string | null
  member?: {
    id: string
    name: string
    email: string
  }
  preInterviewResponse?: PreInterviewResponse | null
}

function FPLPMeetingsPageContent() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<LPMeeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMeeting, setSelectedMeeting] = useState<LPMeeting | null>(null)
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const [expandedPreInterview, setExpandedPreInterview] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id && user?.role === 'fp') {
      fetchMeetings()
    }
  }, [user?.id, user?.role])

  const fetchMeetings = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/lp-meetings/my-scheduled?fpId=${user.id}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('面談一覧の取得に失敗しました')
      }
      const data = await response.json()
      setMeetings(data.meetings || [])
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMeeting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/lp-meetings/${selectedMeeting.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          notes: notes || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '面談完了の確認に失敗しました')
      }

      alert('面談完了を確認しました')
      setShowCompleteForm(false)
      setSelectedMeeting(null)
      setNotes('')
      await fetchMeetings()
    } catch (error: any) {
      alert(error.message || '面談完了の確認に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge className="bg-blue-100 text-blue-800">予約済み</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">完了</Badge>
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

  const getPreInterviewStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">回答済み</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-yellow-100 text-yellow-800">回答中</Badge>
      case 'PENDING':
        return <Badge className="bg-gray-100 text-gray-800">未回答</Badge>
      default:
        return null
    }
  }

  const formatAnswerValue = (value: any): string => {
    if (value === null || value === undefined) return '回答なし'
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'boolean') return value ? 'はい' : 'いいえ'
    return String(value)
  }

  const renderPreInterviewAnswers = (meeting: LPMeeting) => {
    const response = meeting.preInterviewResponse
    if (!response || response.status !== 'COMPLETED') return null

    const isExpanded = expandedPreInterview === meeting.id

    return (
      <div className="mt-3 border-t pt-3">
        <button
          onClick={() => setExpandedPreInterview(isExpanded ? null : meeting.id)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-slate-700">事前アンケート回答</span>
            {getPreInterviewStatusBadge(response.status)}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-3 bg-slate-50 p-3 rounded-lg">
            {response.template.questions.map((question) => {
              const answer = response.answers.find(a => a.questionId === question.id)
              return (
                <div key={question.id} className="border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                  <p className="text-xs text-slate-500 mb-1">
                    {question.category && <span className="mr-1">[{question.category}]</span>}
                    {question.question}
                  </p>
                  <p className="text-sm text-slate-900">
                    {answer ? formatAnswerValue(answer.value) : '回答なし'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

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
            {/* 予約済み面談 */}
            {scheduledMeetings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    予約済み面談 ({scheduledMeetings.length}件)
                  </CardTitle>
                  <CardDescription>面談実施後、完了ボタンをクリックしてください</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scheduledMeetings.map((meeting) => (
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
                              {getStatusBadge(meeting.status)}
                            </div>
                            {meeting.scheduledAt && (
                              <div className="flex items-center space-x-2 mb-2">
                                <Clock className="h-4 w-4 text-slate-600" />
                                <p className="text-sm text-slate-900">
                                  {formatDateTime(new Date(meeting.scheduledAt))}
                                </p>
                              </div>
                            )}
                            {meeting.meetingUrl && (
                              <div className="flex items-center space-x-2 mb-2">
                                <Video className="h-4 w-4 text-slate-600" />
                                <a
                                  href={meeting.meetingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {meeting.meetingUrl}
                                </a>
                                <span className="text-xs text-slate-500">
                                  ({getPlatformLabel(meeting.meetingPlatform)})
                                </span>
                              </div>
                            )}
                            {meeting.memberNotes && (
                              <div className="mt-2 p-2 bg-slate-50 rounded">
                                <p className="text-xs font-medium text-slate-700 mb-1">メンバーからの要望・質問</p>
                                <p className="text-sm text-slate-600">{meeting.memberNotes}</p>
                              </div>
                            )}
                            {meeting.preInterviewResponse && (
                              <div className="mt-2">
                                {meeting.preInterviewResponse.status === 'COMPLETED' ? (
                                  renderPreInterviewAnswers(meeting)
                                ) : (
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <ClipboardList className="h-4 w-4" />
                                    <span>事前アンケート: </span>
                                    {getPreInterviewStatusBadge(meeting.preInterviewResponse.status)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedMeeting(meeting)
                              setShowCompleteForm(true)
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            完了
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 面談完了フォーム */}
            {showCompleteForm && selectedMeeting && (
              <Card>
                <CardHeader>
                  <CardTitle>面談完了の確認</CardTitle>
                  <CardDescription>
                    {selectedMeeting.member?.name}さんとの面談を完了としてマークします
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleComplete} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        面談メモ（任意）
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="面談の内容やメモがあれば記入してください"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            確認中...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            面談完了を確認
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCompleteForm(false)
                          setSelectedMeeting(null)
                          setNotes('')
                        }}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </form>
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
                  <CardDescription>過去に完了した面談</CardDescription>
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
                                実施日時: {formatDateTime(new Date(meeting.scheduledAt))}
                              </p>
                            )}
                            {meeting.completedAt && (
                              <p className="text-sm text-slate-600 mb-1">
                                完了日時: {formatDateTime(new Date(meeting.completedAt))}
                              </p>
                            )}
                            {meeting.notes && (
                              <div className="mt-2 p-2 bg-green-50 rounded">
                                <p className="text-xs font-medium text-slate-700 mb-1">面談メモ</p>
                                <p className="text-sm text-slate-600">{meeting.notes}</p>
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

            {meetings.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">予約済みの面談はありません</p>
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

export default function FPLPMeetingsPage() {
  return (
    <ProtectedRoute requiredRoles={['fp']}>
      <FPLPMeetingsPageContent />
    </ProtectedRoute>
  )
}

