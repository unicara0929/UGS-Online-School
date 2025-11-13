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
import { LogOut, Plus, Calendar, Clock, MapPin, Users, Video, Edit, Trash2, Loader2 } from "lucide-react"

function AdminEventsPageContent() {
  const { user, logout } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [events, setEvents] = useState<AdminEventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [newEvent, setNewEvent] = useState<CreateEventForm>({
    title: "",
    description: "",
    date: "",
    time: "",
    type: "optional",
    isOnline: true,
    location: "",
    maxParticipants: 50,
    status: "upcoming",
  })

  const fetchEvents = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/events", {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "イベント情報の取得に失敗しました")
      }

      const formattedEvents: AdminEventItem[] = data.events.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        type: event.type,
        isOnline: event.isOnline,
        location: event.location,
        maxParticipants: event.maxParticipants,
        status: event.status,
        currentParticipants: event.currentParticipants,
        registrations: event.registrations,
      }))

      setEvents(formattedEvents)
    } catch (err) {
      console.error("Failed to fetch admin events:", err)
      setError(err instanceof Error ? err.message : "イベント情報の取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      alert("イベント名と日付は必須です")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(newEvent),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "イベントの作成に失敗しました")
      }

      setEvents(prev => [...prev, data.event])
      setNewEvent({
        title: "",
        description: "",
        date: "",
        time: "",
        type: "optional",
        isOnline: true,
        location: "",
        maxParticipants: 50,
        status: "upcoming",
      })
      setShowCreateForm(false)
    } catch (err) {
      console.error("Failed to create event:", err)
      alert(err instanceof Error ? err.message : "イベントの作成に失敗しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("このイベントを削除しますか？")) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "イベントの削除に失敗しました")
      }

      setEvents(prev => prev.filter(event => event.id !== id))
    } catch (err) {
      console.error("Failed to delete event:", err)
      alert(err instanceof Error ? err.message : "イベントの削除に失敗しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy年M月d日(E)", { locale: ja })
    } catch {
      return dateString
    }
  }

  const totalParticipants = useMemo(
    () => events.reduce((sum, event) => sum + event.currentParticipants, 0),
    [events]
  )

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
                <h1 className="text-2xl font-bold text-slate-900">イベント管理</h1>
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
                <h2 className="text-2xl font-bold text-slate-900">イベント管理</h2>
                <p className="text-slate-600">イベントの作成・編集・削除</p>
                <p className="text-xs text-slate-400 mt-1">
                  参加者合計: {totalParticipants}名
                </p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新規イベント作成
              </Button>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* 新規イベント作成フォーム */}
            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle>新規イベント作成</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        イベント名
                      </label>
                      <input
                        type="text"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="イベント名を入力"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        日付
                      </label>
                      <input
                        type="date"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        時間
                      </label>
                      <input
                        type="text"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="例: 19:00-21:00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        イベントタイプ
                      </label>
                      <select
                        value={newEvent.type}
                        onChange={(e) => setNewEvent({...newEvent, type: e.target.value as CreateEventForm['type']})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="optional">任意</option>
                        <option value="required">必須</option>
                        <option value="manager-only">Mgr限定</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        最大参加者数
                      </label>
                      <input
                        type="number"
                        value={newEvent.maxParticipants ?? ""}
                        onChange={(e) => {
                          const value = e.target.value
                          setNewEvent({
                            ...newEvent,
                            maxParticipants: value === "" ? null : parseInt(value),
                          })
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        開催形式
                      </label>
                      <select
                        value={newEvent.isOnline ? "online" : "offline"}
                        onChange={(e) => setNewEvent({...newEvent, isOnline: e.target.value === "online"})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="online">オンライン</option>
                        <option value="offline">オフライン</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        説明
                      </label>
                      <textarea
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        rows={3}
                        placeholder="イベントの説明を入力"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        場所
                      </label>
                      <input
                        type="text"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="オンライン（Zoom）または会場名"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        ステータス
                      </label>
                      <select
                        value={newEvent.status}
                        onChange={(e) => setNewEvent({...newEvent, status: e.target.value as CreateEventForm['status']})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="upcoming">予定</option>
                        <option value="completed">完了</option>
                        <option value="cancelled">中止</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleCreateEvent} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          作成中...
                        </span>
                      ) : (
                        "イベント作成"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false)
                        setNewEvent({
                          title: "",
                          description: "",
                          date: "",
                          time: "",
                          type: "optional",
                          isOnline: true,
                          location: "",
                          maxParticipants: 50,
                          status: "upcoming",
                        })
                      }}
                    >
                      キャンセル
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* イベント一覧 */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center text-slate-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  読み込み中です
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {events.map(event => (
                  <Card key={event.id} className="hover:shadow-xl transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={getEventTypeColor(event.type)}>
                          {getEventTypeLabel(event.type)}
                        </Badge>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteEvent(event.id)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                          {event.time || "時間未定"}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          {event.isOnline ? (
                            <Video className="h-4 w-4 mr-2" />
                          ) : (
                            <MapPin className="h-4 w-4 mr-2" />
                          )}
                          {event.location || (event.isOnline ? "オンライン" : "未設定")}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <Users className="h-4 w-4 mr-2" />
                          {event.currentParticipants}/{event.maxParticipants ?? "∞"}名
                        </div>
                        <div className="text-xs text-slate-500">
                          ステータス: {event.status === "upcoming" ? "予定" : event.status === "completed" ? "完了" : "中止"}
                        </div>
                      </div>

                      {event.registrations.length > 0 ? (
                        <div className="mt-4">
                          <p className="text-sm font-semibold text-slate-700 mb-1">参加者一覧</p>
                          <ul className="space-y-1 max-h-32 overflow-y-auto">
                            {event.registrations.map((registration) => (
                              <li key={registration.id} className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                <span className="font-medium">{registration.userName || "名前未設定"}</span>
                                <span className="ml-2 text-slate-500">{registration.userEmail || "メール未設定"}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 mt-4">
                          参加者はまだいません
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminEventsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminEventsPageContent />
    </ProtectedRoute>
  )
}

type AdminEventItem = {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: 'required' | 'optional' | 'manager-only'
  isOnline: boolean
  location: string
  maxParticipants: number | null
  status: 'upcoming' | 'completed' | 'cancelled'
  currentParticipants: number
  registrations: Array<{
    id: string
    userId: string
    userName: string
    userEmail: string
    registeredAt: string
  }>
}

type CreateEventForm = {
  title: string
  description: string
  date: string
  time: string
  type: 'required' | 'optional' | 'manager-only'
  isOnline: boolean
  location: string
  maxParticipants: number | null
  status: 'upcoming' | 'completed' | 'cancelled'
}
