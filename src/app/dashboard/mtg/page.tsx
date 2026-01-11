'use client'

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Video, Loader2, CheckCircle2, Sparkles, ArrowRight, Users, AlertCircle } from "lucide-react"
import { AttendanceCodeInput } from "@/components/events/attendance-code-input"
import { VideoSurveyAttendance } from "@/components/events/video-survey-attendance"

type MtgItem = {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  status: 'upcoming' | 'completed' | 'cancelled'
  thumbnailUrl: string | null
  isRegistered: boolean
  hasAttendanceCode: boolean
  attendanceDeadline: string | null
  vimeoUrl: string | null
  surveyUrl: string | null
  attendanceMethod: 'CODE' | 'VIDEO_SURVEY' | null
  attendanceCompletedAt: string | null
  videoWatched: boolean
  surveyCompleted: boolean
  isNew: boolean
  onlineMeetingUrl: string | null
  applicationDeadline: string | null
  currentParticipants: number
}

function MtgPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<MtgItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMtgEvents = async () => {
      if (!user?.id) {
        console.log('No user ID available, skipping fetch')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/events?userId=${encodeURIComponent(user.id)}&category=MTG`, {
          credentials: 'include'
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '月初MTGの取得に失敗しました')
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || '月初MTGの取得に失敗しました')
        }

        const formattedEvents: MtgItem[] = data.events.map((event: any) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          location: event.location,
          status: event.status,
          thumbnailUrl: event.thumbnailUrl || null,
          isRegistered: event.isRegistered,
          hasAttendanceCode: event.hasAttendanceCode || false,
          attendanceDeadline: event.attendanceDeadline || null,
          vimeoUrl: event.vimeoUrl || null,
          surveyUrl: event.surveyUrl || null,
          attendanceMethod: event.attendanceMethod || null,
          attendanceCompletedAt: event.attendanceCompletedAt || null,
          videoWatched: event.videoWatched || false,
          surveyCompleted: event.surveyCompleted || false,
          isNew: event.isNew || false,
          onlineMeetingUrl: event.onlineMeetingUrl || null,
          applicationDeadline: event.applicationDeadline || null,
          currentParticipants: event.currentParticipants || 0,
        }))

        setEvents(formattedEvents)
      } catch (err) {
        console.error('Failed to fetch MTG events:', err)
        setError(err instanceof Error ? err.message : '月初MTGの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMtgEvents()
  }, [user?.id])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy年M月d日(E)", { locale: ja })
    } catch {
      return dateString
    }
  }

  const upcomingEvents = useMemo(() =>
    events.filter(event => event.status === 'upcoming'),
    [events]
  )

  const pastEvents = useMemo(() =>
    events.filter(event => event.status === 'completed'),
    [events]
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <PageHeader title="月初（全体MTG）" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">月初（全体MTG）</h2>
              <p className="text-slate-600">毎月の全体ミーティングに参加しましょう</p>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center text-slate-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  読み込み中です
                </div>
              </div>
            ) : (
              <>
                {/* 開催予定の月初MTG */}
                {upcomingEvents.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">開催予定</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {upcomingEvents.map(event => (
                        <Card key={event.id} className="hover:shadow-xl transition-all duration-300 border-blue-200 bg-blue-50/30">
                          {event.thumbnailUrl && (
                            <div className="w-full h-48 overflow-hidden rounded-t-lg">
                              <img
                                src={event.thumbnailUrl}
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                              {event.isNew && (
                                <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 animate-pulse">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  NEW
                                </Badge>
                              )}
                              <Badge variant="destructive">必須参加</Badge>
                            </div>
                            <CardTitle className="text-lg">{event.title}</CardTitle>
                            <CardDescription>{event.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex items-center text-sm text-slate-600">
                                <Calendar className="h-4 w-4 mr-2" />
                                {formatDate(event.date)}
                              </div>
                              <div className="flex items-center text-sm text-slate-600">
                                <Clock className="h-4 w-4 mr-2" />
                                {event.time || '時間未定'}
                              </div>
                              <div className="flex items-center text-sm text-slate-600">
                                <Video className="h-4 w-4 mr-2" />
                                {event.location}
                              </div>
                              {event.onlineMeetingUrl && (
                                <div className="mt-2">
                                  <a
                                    href={event.onlineMeetingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                  >
                                    <Video className="h-4 w-4 mr-1" />
                                    オンライン参加リンク
                                  </a>
                                </div>
                              )}
                              {event.applicationDeadline && (
                                <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded flex items-center">
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  申込期限: {formatDate(event.applicationDeadline)}
                                </div>
                              )}
                            </div>

                            <div className="mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => router.push(`/dashboard/events/${event.id}`)}
                              >
                                詳細を見る
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Button>
                            </div>

                            {/* 出席確認セクション */}
                            {event.isRegistered && !event.attendanceCompletedAt && event.hasAttendanceCode && !event.vimeoUrl && (
                              <div className="mt-4">
                                {event.attendanceDeadline && new Date(event.attendanceDeadline) < new Date() ? (
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <p className="text-sm text-slate-600">出席確認の期限が過ぎました</p>
                                  </div>
                                ) : (
                                  <AttendanceCodeInput
                                    eventId={event.id}
                                    eventTitle={event.title}
                                    onSuccess={() => window.location.reload()}
                                  />
                                )}
                              </div>
                            )}

                            {event.attendanceCompletedAt && (
                              <div className="mt-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 text-green-800">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <div>
                                      <p className="font-semibold">出席完了</p>
                                      <p className="text-sm">
                                        {event.attendanceMethod === 'CODE' ? '参加コードで確認済み' : '録画視聴+アンケート完了'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 過去の月初MTG（録画視聴可能） */}
                {pastEvents.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">過去の月初MTG（録画視聴）</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {pastEvents.map(event => (
                        <Card key={event.id} className="hover:shadow-lg transition-all duration-300">
                          {event.thumbnailUrl && (
                            <div className="w-full h-40 overflow-hidden rounded-t-lg">
                              <img
                                src={event.thumbnailUrl}
                                alt={event.title}
                                className="w-full h-full object-cover opacity-80"
                              />
                            </div>
                          )}
                          <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">終了</Badge>
                              {event.attendanceCompletedAt && (
                                <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  出席済み
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-lg">{event.title}</CardTitle>
                            <CardDescription>{event.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex items-center text-sm text-slate-600">
                                <Calendar className="h-4 w-4 mr-2" />
                                {formatDate(event.date)}
                              </div>
                            </div>

                            {/* 録画視聴+アンケート */}
                            {(event.vimeoUrl || event.surveyUrl) && !event.attendanceCompletedAt && (
                              <div className="mt-4">
                                {event.attendanceDeadline && new Date(event.attendanceDeadline) < new Date() ? (
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <p className="text-sm text-slate-600">出席確認の期限が過ぎました</p>
                                  </div>
                                ) : (
                                  <VideoSurveyAttendance
                                    eventId={event.id}
                                    eventTitle={event.title}
                                    vimeoUrl={event.vimeoUrl}
                                    surveyUrl={event.surveyUrl}
                                    videoWatched={event.videoWatched}
                                    surveyCompleted={event.surveyCompleted}
                                    onSuccess={() => window.location.reload()}
                                  />
                                )}
                              </div>
                            )}

                            {event.attendanceCompletedAt && (
                              <div className="mt-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 text-green-800">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <p className="text-sm font-medium">出席完了</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => router.push(`/dashboard/events/${event.id}`)}
                              >
                                詳細を見る
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {events.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">月初MTGはまだありません</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function MtgPage() {
  return (
    <ProtectedRoute requiredRoles={['fp', 'manager', 'admin']}>
      <MtgPageContent />
    </ProtectedRoute>
  )
}
