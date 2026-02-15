'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, Loader2, Sparkles, ChevronRight, CheckCircle2 } from "lucide-react"

type Schedule = {
  id: string
  date: string
  time: string
  location: string
  status: string
  registrationCount: number
}

type TrainingItem = {
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
  schedules: Schedule[]
}

function TrainingPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<TrainingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrainingEvents = async () => {
      if (!user?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/events?userId=${encodeURIComponent(user.id)}&category=TRAINING`, {
          credentials: 'include'
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '研修情報の取得に失敗しました')
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || '研修情報の取得に失敗しました')
        }

        const formattedEvents: TrainingItem[] = data.events.map((event: any) => ({
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
          schedules: event.schedules || [],
        }))

        setEvents(formattedEvents)
      } catch (err) {
        console.error('Failed to fetch training events:', err)
        setError(err instanceof Error ? err.message : '研修情報の取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrainingEvents()
  }, [user?.id])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未定'
    try {
      return format(new Date(dateString), "M/d(E)", { locale: ja })
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

  const handleEventClick = (eventId: string) => {
    router.push(`/dashboard/training/${eventId}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64 min-w-0">
        <PageHeader title="イベント・研修" />

        <main className="px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">イベント・研修一覧</h2>
              <p className="text-slate-600">スキルアップのためのイベント・研修に参加しましょう</p>
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
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                  読み込み中です
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 開催予定の研修 */}
                {upcomingEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      開催予定
                    </h3>
                    <Card className="border-emerald-200">
                      <div className="divide-y divide-slate-100">
                        {upcomingEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event.id)}
                            className="px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center">
                              {/* タイトル・バッジ */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {event.isNew && (
                                    <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 text-[10px] px-1.5 py-0">
                                      <Sparkles className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                                      NEW
                                    </Badge>
                                  )}
                                  <Badge className="bg-emerald-600 text-[10px] px-1.5 py-0">
                                    研修
                                  </Badge>
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
                                <p className="text-sm font-medium text-slate-900 group-hover:text-primary-600 mt-1">
                                  {event.title}
                                </p>
                              </div>

                              {/* 矢印 */}
                              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0" aria-hidden="true" />
                            </div>

                            {/* 日程を表示（すべてのイベントで統一フォーマット） */}
                            <div className="mt-2 space-y-1">
                              {event.schedules.length > 0 ? (
                                event.schedules.map((schedule, index) => (
                                  <div key={schedule.id} className="flex items-center text-xs text-slate-500">
                                    {event.schedules.length > 1 && (
                                      <span className="w-4 text-center text-slate-400">{index + 1}.</span>
                                    )}
                                    <span className={`font-medium ${event.schedules.length > 1 ? 'ml-1' : ''}`}>
                                      {formatDate(schedule.date)}
                                    </span>
                                    <span className="ml-2">{schedule.time || ''}</span>
                                    {schedule.location && (
                                      <span className="ml-2 text-slate-400">@ {schedule.location}</span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-slate-500">
                                  <span className="font-medium">{formatDate(event.date)}</span>
                                  <span className="ml-2">{event.time || ''}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {/* 過去の研修 */}
                {pastEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      過去の研修
                    </h3>
                    <Card>
                      <div className="divide-y divide-slate-100">
                        {pastEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event.id)}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group opacity-70"
                          >
                            <div className="flex items-center">
                              {/* タイトル・バッジ */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {event.isRegistered && (
                                    <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700 text-[10px] px-1.5 py-0">
                                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                                      参加済
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-slate-700 group-hover:text-primary-600 mt-1">
                                  {event.title}
                                </p>
                              </div>

                              {/* 矢印 */}
                              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0" aria-hidden="true" />
                            </div>

                            {/* 日程を表示 */}
                            <div className="mt-2 space-y-1">
                              {event.schedules.length > 0 ? (
                                event.schedules.map((schedule, index) => (
                                  <div key={schedule.id} className="flex items-center text-xs text-slate-500">
                                    {event.schedules.length > 1 && (
                                      <span className="w-4 text-center text-slate-400">{index + 1}.</span>
                                    )}
                                    <span className={`font-medium ${event.schedules.length > 1 ? 'ml-1' : ''}`}>
                                      {formatDate(schedule.date)}
                                    </span>
                                    <span className="ml-2">{schedule.time || ''}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-slate-500">
                                  <span className="font-medium">{formatDate(event.date)}</span>
                                  <span className="ml-2">{event.time || ''}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {events.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <GraduationCap className="h-12 w-12 text-slate-400 mx-auto mb-4" aria-hidden="true" />
                      <p className="text-slate-600">現在参加可能な研修はありません</p>
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

export default function TrainingPage() {
  return (
    <ProtectedRoute requiredRoles={['fp', 'manager', 'admin']}>
      <TrainingPageContent />
    </ProtectedRoute>
  )
}
