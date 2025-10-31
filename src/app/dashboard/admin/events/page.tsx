'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogOut, Plus, Calendar, Clock, MapPin, Users, Video, Edit, Trash2 } from "lucide-react"
import { useState } from "react"

function AdminEventsPageContent() {
  const { user, logout } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)

  // モックデータ
  const [events, setEvents] = useState([
    {
      id: "1",
      title: "月初MTG",
      description: "月次定例会議 - 今月の振り返りと来月の目標設定",
      date: "2024-01-08",
      time: "19:00-21:00",
      type: "required",
      isOnline: true,
      location: "オンライン（Zoom）",
      maxParticipants: 100,
      currentParticipants: 45,
      status: "upcoming"
    },
    {
      id: "2",
      title: "FP交流会",
      description: "FPエイド同士の情報交換とネットワーキング",
      date: "2024-01-15",
      time: "19:00-20:30",
      type: "optional",
      isOnline: true,
      location: "オンライン（Zoom）",
      maxParticipants: 50,
      currentParticipants: 23,
      status: "upcoming"
    }
  ])

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    type: "optional",
    isOnline: true,
    location: "",
    maxParticipants: 50
  })

  const handleCreateEvent = () => {
    const event = {
      id: Date.now().toString(),
      ...newEvent,
      currentParticipants: 0,
      status: "upcoming"
    }
    setEvents([...events, event])
    setNewEvent({
      title: "",
      description: "",
      date: "",
      time: "",
      type: "optional",
      isOnline: true,
      location: "",
      maxParticipants: 50
    })
    setShowCreateForm(false)
  }

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter(event => event.id !== id))
  }

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
              </div>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新規イベント作成
              </Button>
            </div>

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
                        onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
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
                        value={newEvent.maxParticipants}
                        onChange={(e) => setNewEvent({...newEvent, maxParticipants: parseInt(e.target.value)})}
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
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleCreateEvent}>
                      イベント作成
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                      キャンセル
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* イベント一覧 */}
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
                        <Button size="sm" variant="outline" onClick={() => handleDeleteEvent(event.id)}>
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
                      <div className="flex items-center text-sm text-slate-600">
                        <Users className="h-4 w-4 mr-2" />
                        {event.currentParticipants}/{event.maxParticipants}名
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
