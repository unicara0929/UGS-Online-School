'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogOut, Calendar, Clock, MapPin, Users, Video } from "lucide-react"

function EventsPageContent() {
  const { user, logout } = useAuth()

  // モックデータ
  const events = [
    {
      id: "1",
      title: "月初MTG",
      description: "月次定例会議 - 今月の振り返りと来月の目標設定",
      date: "2024年1月8日",
      time: "19:00-21:00",
      type: "required" as const,
      isOnline: true,
      location: "オンライン（Zoom）",
      maxParticipants: 100,
      currentParticipants: 45,
      isRegistered: false,
      status: "upcoming" as const
    },
    {
      id: "2",
      title: "FP交流会",
      description: "FPエイド同士の情報交換とネットワーキング",
      date: "2024年1月15日",
      time: "19:00-20:30",
      type: "optional" as const,
      isOnline: true,
      location: "オンライン（Zoom）",
      maxParticipants: 50,
      currentParticipants: 23,
      isRegistered: true,
      status: "upcoming" as const
    },
    {
      id: "3",
      title: "スキルアップセミナー",
      description: "最新の金融知識と実践的なスキルを学ぶ",
      date: "2024年1月22日",
      time: "19:00-21:00",
      type: "optional" as const,
      isOnline: false,
      location: "東京都渋谷区",
      maxParticipants: 30,
      currentParticipants: 18,
      isRegistered: false,
      status: "upcoming" as const
    },
    {
      id: "4",
      title: "マネージャー特別セミナー",
      description: "マネージャー限定のリーダーシップ研修",
      date: "2024年1月25日",
      time: "19:00-21:30",
      type: "manager-only" as const,
      isOnline: true,
      location: "オンライン（Zoom）",
      maxParticipants: 20,
      currentParticipants: 8,
      isRegistered: false,
      status: "upcoming" as const
    }
  ]

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
    return true
  }

  const filteredEvents = events.filter(event => {
    if (event.type === 'manager-only') {
      return user?.role === 'manager' || user?.role === 'admin'
    }
    return true
  })

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredEvents.map(event => (
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
                        {event.date}
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {event.time}
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
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredEvents.length === 0 && (
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
