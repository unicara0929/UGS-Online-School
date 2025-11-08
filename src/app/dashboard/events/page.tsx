'use client'

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogOut, Calendar, Clock, MapPin, Users, Video, Loader2 } from "lucide-react"

function EventsPageContent() {
  const { user, logout } = useAuth()
  const [events, setEvents] = useState<EventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user?.id) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/events?userId=${encodeURIComponent(user.id)}`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "イベントの取得に失敗しました")
        }

        const formattedEvents: EventItem[] = data.events.map((event: any) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          type: event.type,
          isOnline: event.isOnline,
          location: event.location,
          maxParticipants: event.maxParticipants,
          currentParticipants: event.currentParticipants,
          isRegistered: event.isRegistered,
          status: event.status,
        }))

        setEvents(formattedEvents)
      } catch (err) {
        console.error("Failed to fetch events:", err)
        setError(err instanceof Error ? err.message : "イベントの取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [user?.id])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy年M月d日(E)", { locale: ja })
    } catch {
      return dateString
    }
  }

  const visibleEvents = useMemo(() => {
    return events.filter(event => {
      if (event.type === 'manager-only') {
        return user?.role === 'manager' || user?.role === 'admin'
      }
      return true
    })
  }, [events, user?.role])

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'required': return 'destructive'
      case 'optional': return 'secondary'
      case 'manager-only': return 'default'
      default: return 'secondary'
    }
  }

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'required': return '必須'
      case 'optional': return '任意'
      case 'manager-only': return 'Mgr限定'
      default: return type
    }
  }

  const canRegisterForEvent = (event: any) => {
    if (event.type === 'manager-only' && user?.role !== 'manager' && user?.role !== 'admin') {
      return false
    }
    if (event.maxParticipants !== null && event.maxParticipants !== undefined) {
      return event.currentParticipants < event.maxParticipants
    }
    return true
  }

  const handleToggleRegistration = async (event: EventItem) => {
    if (!user?.id) return

    const action = event.isRegistered ? 'unregister' : 'register'

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        {/* ヘッダー */}
        <header className="bg-white shadow-lg border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-slate-900">イベント</h1>
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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">イベント一覧</h2>
                <p className="text-slate-600">参加予定のイベントと新着イベント</p>
              </div>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visibleEvents.map(event => (
                <Card key={event.id} className="hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={getEventTypeColor(event.type)}>
                        {getEventTypeLabel(event.type)}
                      </Badge>
                      <div className="flex items-center text-sm text-slate-500">
                        <Users className="h-4 w-4 mr-1" />
                        {event.currentParticipants}/{event.maxParticipants}名
                      </div>
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
                        {event.isOnline ? (
                          <Video className="h-4 w-4 mr-2" />
                        ) : (
                          <MapPin className="h-4 w-4 mr-2" />
                        )}
                        {event.location}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {canRegisterForEvent(event) ? (
                        <Button 
                          size="sm" 
                          variant={event.isRegistered ? "outline" : "default"}
                          className="flex-1"
                          disabled={isSubmitting}
                          onClick={() => handleToggleRegistration(event)}
                        >
                          {event.isRegistered ? "キャンセル" : "申し込む"}
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          disabled
                          className="flex-1"
                        >
                          参加不可
                        </Button>
                      )}
                    </div>

                    {event.type === 'manager-only' && user?.role !== 'manager' && user?.role !== 'admin' && (
                      <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                        マネージャー限定イベントです
                      </div>
                    )}

                    {event.maxParticipants !== null && event.maxParticipants !== undefined && (
                      <div className="mt-2 text-xs text-slate-500">
                        定員: {event.currentParticipants}/{event.maxParticipants}名
                      </div>
                    )}
                  </CardContent>
                </Card>
                ))}
              </div>
            )}

            {!isLoading && visibleEvents.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">参加可能なイベントがありません</p>
                </CardContent>
              </Card>
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

type EventItem = {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: 'required' | 'optional' | 'manager-only'
  isOnline: boolean
  location: string
  maxParticipants: number | null
  currentParticipants: number
  isRegistered: boolean
  status: 'upcoming' | 'completed' | 'cancelled'
}
