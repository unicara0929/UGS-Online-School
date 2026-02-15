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
import { Calendar, Loader2, Sparkles, ChevronRight, CheckCircle2, AlertCircle, Video } from "lucide-react"

type MtgItem = {
  id: string
  title: string
  date: string
  time: string
  status: 'upcoming' | 'completed' | 'cancelled'
  isNew: boolean
  attendanceCompletedAt: string | null
  vimeoUrl: string | null
  surveyUrl: string | null
}

function MtgPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<MtgItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMtgEvents = async () => {
      if (!user?.id) return

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
          date: event.date,
          time: event.time,
          status: event.status,
          isNew: event.isNew || false,
          attendanceCompletedAt: event.attendanceCompletedAt || null,
          vimeoUrl: event.vimeoUrl || null,
          surveyUrl: event.surveyUrl || null,
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
    router.push(`/dashboard/events/${eventId}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64 min-w-0">
        <PageHeader title="月初（全体MTG）" />

        <main className="px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
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
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                  読み込み中です
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 開催予定の月初MTG */}
                {upcomingEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      開催予定
                    </h3>
                    <Card className="border-blue-200">
                      <div className="divide-y divide-slate-100">
                        {upcomingEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event.id)}
                            className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors group"
                          >
                            {/* 日付 */}
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
                              <div className="flex items-center gap-2">
                                {event.isNew && (
                                  <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 text-[10px] px-1.5 py-0">
                                    <Sparkles className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                                    NEW
                                  </Badge>
                                )}
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  必須参加
                                </Badge>
                              </div>
                              <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary-600">
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

                {/* 過去の月初MTG（録画視聴可能） */}
                {pastEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      過去の月初MTG（録画視聴）
                    </h3>
                    <Card>
                      <div className="divide-y divide-slate-100">
                        {pastEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event.id)}
                            className="flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group"
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
                                {event.attendanceCompletedAt ? (
                                  <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700 text-[10px] px-1.5 py-0">
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                                    出席済
                                  </Badge>
                                ) : event.vimeoUrl ? (
                                  <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 text-[10px] px-1.5 py-0">
                                    <Video className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                                    録画視聴可
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700 text-[10px] px-1.5 py-0">
                                    <AlertCircle className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                                    未出席
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
                      <p className="text-slate-600">月初MTGはまだありません</p>
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

export default function MtgPage() {
  return (
    <ProtectedRoute requiredRoles={['fp', 'manager', 'admin']}>
      <MtgPageContent />
    </ProtectedRoute>
  )
}
