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
import { Calendar, Clock, MapPin, Video, Loader2, Users, Sparkles, ArrowRight, GraduationCap } from "lucide-react"
import { useNewBadge } from "@/hooks/use-new-badge"

type TrainingItem = {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  venueType: 'online' | 'offline' | 'hybrid'
  status: 'upcoming' | 'completed' | 'cancelled'
  thumbnailUrl: string | null
  maxParticipants: number | null
  currentParticipants: number
  isRegistered: boolean
  isPaid: boolean
  price: number | null
  paymentStatus: string | null
  isNew: boolean
}

function TrainingPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<TrainingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchTrainingEvents = async () => {
      if (!user?.id) {
        console.log('No user ID available, skipping fetch')
        return
      }

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
          description: event.description,
          date: event.date,
          time: event.time,
          location: event.location,
          venueType: event.venueType || 'online',
          status: event.status,
          thumbnailUrl: event.thumbnailUrl || null,
          maxParticipants: event.maxParticipants,
          currentParticipants: event.currentParticipants,
          isRegistered: event.isRegistered,
          isPaid: event.isPaid || false,
          price: event.price || null,
          paymentStatus: event.paymentStatus || null,
          isNew: event.isNew || false,
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

  const canRegisterForEvent = (event: TrainingItem) => {
    if (event.maxParticipants !== null && event.maxParticipants !== undefined && event.maxParticipants > 0) {
      return event.currentParticipants < event.maxParticipants
    }
    return true
  }

  const handleCheckout = async (eventId: string) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/events/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'チェックアウトの作成に失敗しました')
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err)
      alert(err instanceof Error ? err.message : 'チェックアウトの作成に失敗しました')
      setIsSubmitting(false)
    }
  }

  const handleToggleRegistration = async (event: TrainingItem) => {
    if (!user?.id) return

    if (event.isPaid && !event.isRegistered) {
      await handleCheckout(event.id)
      return
    }

    if (event.isPaid && event.paymentStatus === 'PENDING') {
      await handleCheckout(event.id)
      return
    }

    const action = event.isRegistered ? 'unregister' : 'register'

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          eventId: event.id,
          action,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '処理に失敗しました')
      }

      setEvents(prev =>
        prev.map(item =>
          item.id === event.id
            ? {
                ...item,
                isRegistered: action === 'register',
                currentParticipants: data.currentParticipants ?? item.currentParticipants,
              }
            : item
        )
      )
    } catch (err) {
      console.error('Failed to update registration:', err)
      alert(err instanceof Error ? err.message : '処理に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <PageHeader title="研修" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">研修一覧</h2>
              <p className="text-slate-600">スキルアップのための研修に参加しましょう</p>
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
                {/* 開催予定の研修 */}
                {upcomingEvents.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">開催予定</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {upcomingEvents.map(event => (
                        <Card key={event.id} className="hover:shadow-xl transition-all duration-300 border-emerald-200 bg-emerald-50/30">
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
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {event.isNew && (
                                <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 animate-pulse">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  NEW
                                </Badge>
                              )}
                              <Badge className="bg-emerald-600">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                研修
                              </Badge>
                              {event.isPaid && (
                                <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700">
                                  ¥{event.price?.toLocaleString()}
                                </Badge>
                              )}
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
                                {event.venueType === 'online' ? (
                                  <Video className="h-4 w-4 mr-2" />
                                ) : event.venueType === 'offline' ? (
                                  <MapPin className="h-4 w-4 mr-2" />
                                ) : (
                                  <>
                                    <Video className="h-4 w-4 mr-1" />
                                    <MapPin className="h-4 w-4 mr-2" />
                                  </>
                                )}
                                {event.location}
                              </div>
                              <div className="flex items-center text-sm text-slate-500">
                                <Users className="h-4 w-4 mr-1" />
                                {event.maxParticipants !== null && event.maxParticipants > 0
                                  ? `${event.currentParticipants}/${event.maxParticipants}名`
                                  : `${event.currentParticipants}名参加`}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => router.push(`/dashboard/events/${event.id}`)}
                              >
                                詳細を見る
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Button>

                              {canRegisterForEvent(event) ? (
                                <Button
                                  size="sm"
                                  variant={event.isRegistered ? "outline" : "default"}
                                  className="w-full"
                                  disabled={isSubmitting || (event.isPaid && event.paymentStatus === 'PAID')}
                                  onClick={() => handleToggleRegistration(event)}
                                >
                                  {event.isRegistered
                                    ? event.isPaid && event.paymentStatus === 'PAID'
                                      ? '参加確定（支払い済み）'
                                      : event.isPaid && event.paymentStatus === 'PENDING'
                                        ? '支払いを完了する'
                                        : 'キャンセル'
                                    : event.isPaid
                                      ? `¥${event.price?.toLocaleString()}で申し込む`
                                      : '申し込む'
                                  }
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  disabled
                                  className="w-full"
                                >
                                  満員（定員に達しました）
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 過去の研修 */}
                {pastEvents.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">過去の研修</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {pastEvents.map(event => (
                        <Card key={event.id} className="hover:shadow-lg transition-all duration-300 opacity-80">
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
                              {event.isRegistered && (
                                <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                                  参加済み
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-lg">{event.title}</CardTitle>
                            <CardDescription>{event.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center text-sm text-slate-600">
                              <Calendar className="h-4 w-4 mr-2" />
                              {formatDate(event.date)}
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
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {events.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <GraduationCap className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">現在参加可能な研修はありません</p>
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

export default function TrainingPage() {
  return (
    <ProtectedRoute requiredRoles={['fp', 'manager', 'admin']}>
      <TrainingPageContent />
    </ProtectedRoute>
  )
}
