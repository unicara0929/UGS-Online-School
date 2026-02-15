'use client'

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Loader2, Sparkles, ChevronRight, CheckCircle2 } from "lucide-react"
import { useNewBadge } from "@/hooks/use-new-badge"

function EventsPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<EventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const { markCategoryViewed } = useNewBadge()
  const hasMarkedViewed = useRef(false)

  useEffect(() => {
    if (!hasMarkedViewed.current) {
      markCategoryViewed('EVENTS')
      hasMarkedViewed.current = true
    }
  }, [markCategoryViewed])

  // 決済確認処理（Stripeからのリダイレクト後）
  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('session_id')

      if (!sessionId) return

      try {
        const response = await fetch('/api/events/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionId })
        })

        const data = await response.json()

        if (data.success) {
          setPaymentMessage({
            type: 'success',
            text: '決済が完了しました！イベントへの参加が確定しました。'
          })
          window.history.replaceState({}, '', '/dashboard/events')
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else {
          setPaymentMessage({
            type: 'error',
            text: data.message || '決済の確認に失敗しました'
          })
        }
      } catch (error) {
        setPaymentMessage({
          type: 'error',
          text: '決済の確認中にエラーが発生しました'
        })
      }
    }

    verifyPayment()
  }, [])

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/events?userId=${encodeURIComponent(user.id)}&category=REGULAR`, {
          credentials: 'include'
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'イベントの取得に失敗しました')
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'イベントの取得に失敗しました')
        }

        const formattedEvents: EventItem[] = data.events.map((event: any) => ({
          id: event.id,
          title: event.title,
          date: event.date,
          time: event.time,
          status: event.status,
          isRegistered: event.isRegistered,
          isPaid: event.isPaid || false,
          price: event.price || null,
          paymentStatus: event.paymentStatus || null,
          isNew: event.isNew || false,
          attendanceCompletedAt: event.attendanceCompletedAt || null,
          schedules: event.schedules || [],
        }))

        setEvents(formattedEvents)
      } catch (err) {
        console.error('Failed to fetch events:', err)
        setError(err instanceof Error ? err.message : 'イベントの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [user?.id])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未定'
    try {
      return format(new Date(dateString), "M/d(E)", { locale: ja })
    } catch {
      return dateString
    }
  }

  const formatFullDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy年M月d日(E)", { locale: ja })
    } catch {
      return dateString
    }
  }

  // 開催予定と過去イベントに分類
  const upcomingEvents = useMemo(() =>
    events.filter(event => event.status === 'upcoming'),
    [events]
  )

  const pastEvents = useMemo(() =>
    events.filter(event => event.status === 'completed' || event.status === 'cancelled'),
    [events]
  )

  const handleEventClick = (eventId: string) => {
    router.push(`/dashboard/events/${eventId}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64 min-w-0">
        <PageHeader title="キャンペーン案内" />

        <main className="px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">キャンペーン案内</h2>
              <p className="text-slate-600">参加予定のキャンペーンと新着案内</p>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {paymentMessage && (
              <Card className={paymentMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <CardContent className="py-4">
                  <p className={`text-sm font-medium ${paymentMessage.type === 'success' ? 'text-green-800' : 'text-red-600'}`}>
                    {paymentMessage.text}
                  </p>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center text-slate-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                  読み込み中です
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 開催予定のイベント */}
                {upcomingEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      開催予定
                    </h3>
                    <Card>
                      <div className="divide-y divide-slate-100">
                        {upcomingEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event.id)}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center">
                              {/* 日付（単一または複数日程の最初） */}
                              <div className="flex-shrink-0 w-16 text-center">
                                <div className="text-sm font-semibold text-slate-900">
                                  {formatDate(event.date)}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {event.time || '-'}
                                </div>
                              </div>

                              {/* タイトル・バッジ */}
                              <div className="flex-1 ml-4 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {event.isNew && (
                                    <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 text-[10px] px-1.5 py-0">
                                      <Sparkles className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                                      NEW
                                    </Badge>
                                  )}
                                  {event.isPaid && (
                                    <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 text-[10px] px-1.5 py-0">
                                      ¥{event.price?.toLocaleString()}
                                    </Badge>
                                  )}
                                  {event.isRegistered && (
                                    <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700 text-[10px] px-1.5 py-0">
                                      申込済
                                    </Badge>
                                  )}
                                  {event.schedules.length > 1 && (
                                    <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700 text-[10px] px-1.5 py-0">
                                      {event.schedules.length}日程
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary-600">
                                  {event.title}
                                </p>
                              </div>

                              {/* 矢印 */}
                              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0" aria-hidden="true" />
                            </div>

                            {/* 複数日程がある場合、全日程を表示 */}
                            {event.schedules.length > 1 && (
                              <div className="mt-2 ml-20 space-y-1">
                                {event.schedules.map((schedule, index) => (
                                  <div key={schedule.id} className="flex items-center text-xs text-slate-500">
                                    <span className="w-4 text-center text-slate-400">{index + 1}.</span>
                                    <span className="ml-1 font-medium">{formatDate(schedule.date)}</span>
                                    <span className="ml-2">{schedule.time || ''}</span>
                                    {schedule.location && (
                                      <span className="ml-2 text-slate-400">@ {schedule.location}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {/* 過去のイベント */}
                {pastEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      過去のイベント
                    </h3>
                    <Card>
                      <div className="divide-y divide-slate-100">
                        {pastEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event.id)}
                            className="flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group opacity-70"
                          >
                            {/* 日付 */}
                            <div className="flex-shrink-0 w-16 text-center">
                              <div className="text-sm font-semibold text-slate-600">
                                {formatDate(event.date)}
                              </div>
                            </div>

                            {/* タイトル・バッジ */}
                            <div className="flex-1 ml-4 min-w-0">
                              <div className="flex items-center gap-2">
                                {event.attendanceCompletedAt && (
                                  <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700 text-[10px] px-1.5 py-0">
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                                    参加済
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium text-slate-700 truncate group-hover:text-primary-600">
                                {event.title}
                              </p>
                            </div>

                            {/* 矢印 */}
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0" aria-hidden="true" />
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {events.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" aria-hidden="true" />
                      <p className="text-slate-600">参加可能なイベントがありません</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function EventsPage() {
  return (
    <ProtectedRoute>
      <EventsPageContent />
    </ProtectedRoute>
  )
}

type Schedule = {
  id: string
  date: string
  time: string
  location: string
  status: string
  registrationCount: number
}

type EventItem = {
  id: string
  title: string
  date: string | null
  time: string
  status: 'upcoming' | 'completed' | 'cancelled'
  isRegistered: boolean
  isPaid: boolean
  price: number | null
  paymentStatus: string | null
  isNew: boolean
  attendanceCompletedAt: string | null
  schedules: Schedule[]
}
