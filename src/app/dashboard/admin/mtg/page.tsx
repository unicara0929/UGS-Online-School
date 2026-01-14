'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Loader2, Plus, Calendar, Archive, Users, Edit, Trash2, ChevronRight, CheckCircle2, Video } from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/contexts/auth-context'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MtgEventForm } from '@/components/admin/MtgEventForm'
import type { AdminEventItem } from '@/types/event'

type EventTab = 'upcoming' | 'past'

interface MtgEventFormData {
  title: string
  description: string
  date: string
  time: string
  location: string
  onlineMeetingUrl: string
  attendanceCode: string
  applicationDeadline: string
  vimeoUrl?: string
  materialsUrl?: string
}

function AdminMtgPageContent() {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [events, setEvents] = useState<AdminEventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMtgCreateForm, setShowMtgCreateForm] = useState(false)
  const [showMtgEditForm, setShowMtgEditForm] = useState(false)
  const [showMtgCompleteForm, setShowMtgCompleteForm] = useState(false)
  const [editingMtgEvent, setEditingMtgEvent] = useState<AdminEventItem | null>(null)
  const [completingMtgEvent, setCompletingMtgEvent] = useState<AdminEventItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<EventTab>('upcoming')

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'M/d(E)', { locale: ja })
    } catch {
      return dateString
    }
  }

  const fetchEvents = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/events?category=MTG', {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'イベント情報の取得に失敗しました')
      }

      const formattedEvents: AdminEventItem[] = data.events.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        type: event.type,
        targetRoles: event.targetRoles || [],
        attendanceType: event.attendanceType || 'optional',
        venueType: event.venueType || 'online',
        location: event.location,
        maxParticipants: event.maxParticipants,
        status: event.status,
        thumbnailUrl: event.thumbnailUrl || null,
        currentParticipants: event.currentParticipants,
        registrations: event.registrations,
        attendanceCode: event.attendanceCode || null,
        vimeoUrl: event.vimeoUrl || null,
        surveyUrl: event.surveyUrl || null,
        attendanceDeadline: event.attendanceDeadline || null,
        isRecurring: event.isRecurring || false,
        applicationDeadline: event.applicationDeadline || null,
        onlineMeetingUrl: event.onlineMeetingUrl || null,
        summary: event.summary || null,
        photos: event.photos || [],
        materialsUrl: event.materialsUrl || null,
        actualParticipants: event.actualParticipants || null,
        actualLocation: event.actualLocation || null,
        adminNotes: event.adminNotes || null,
        isArchiveOnly: event.isArchiveOnly || false,
      }))

      setEvents(formattedEvents)
    } catch (err) {
      console.error('Failed to fetch MTG events:', err)
      setError(err instanceof Error ? err.message : 'イベント情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  // イベントをタブ別にフィルタリング
  const upcomingEvents = useMemo(() =>
    events.filter(event => event.status === 'upcoming'),
    [events]
  )

  const pastEvents = useMemo(() =>
    events.filter(event => event.status === 'completed' || event.status === 'cancelled'),
    [events]
  )

  const displayedEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents

  // 全体MTG作成
  const handleCreateMtgEvent = async (data: MtgEventFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          date: data.date,
          time: data.time,
          location: data.location,
          onlineMeetingUrl: data.onlineMeetingUrl || null,
          maxParticipants: null,
          attendanceCode: data.attendanceCode || null,
          applicationDeadline: data.applicationDeadline || null,
          status: 'upcoming',
          isRecurring: true,
          eventCategory: 'MTG',
          targetRoles: ['all'],
          attendanceType: 'required',
          venueType: 'online',
          isPaid: false,
          price: null,
          isArchiveOnly: false,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'イベントの作成に失敗しました')
      }

      setShowMtgCreateForm(false)
      await fetchEvents()
    } catch (err) {
      console.error('Failed to create MTG event:', err)
      alert(err instanceof Error ? err.message : 'イベントの作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 全体MTG更新
  const handleUpdateMtgEvent = async (data: MtgEventFormData) => {
    if (!editingMtgEvent) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/events/${editingMtgEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          date: data.date,
          time: data.time,
          location: data.location,
          onlineMeetingUrl: data.onlineMeetingUrl || null,
          attendanceCode: data.attendanceCode || null,
          applicationDeadline: data.applicationDeadline || null,
          type: editingMtgEvent.type,
          targetRoles: editingMtgEvent.targetRoles,
          attendanceType: editingMtgEvent.attendanceType,
          venueType: editingMtgEvent.venueType,
          maxParticipants: editingMtgEvent.maxParticipants,
          status: editingMtgEvent.status,
          thumbnailUrl: editingMtgEvent.thumbnailUrl,
          isRecurring: true,
          vimeoUrl: data.vimeoUrl || null,
          materialsUrl: data.materialsUrl || null,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'イベントの更新に失敗しました')
      }

      setShowMtgEditForm(false)
      setEditingMtgEvent(null)
      await fetchEvents()
    } catch (err) {
      console.error('Failed to update MTG event:', err)
      alert(err instanceof Error ? err.message : 'イベントの更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 全体MTG完了設定
  const handleCompleteMtgEvent = async (data: { vimeoUrl: string; materialsUrl: string }) => {
    if (!completingMtgEvent) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/events/${completingMtgEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: completingMtgEvent.title,
          description: completingMtgEvent.description,
          date: completingMtgEvent.date,
          time: completingMtgEvent.time,
          type: completingMtgEvent.type,
          targetRoles: completingMtgEvent.targetRoles,
          attendanceType: completingMtgEvent.attendanceType,
          venueType: completingMtgEvent.venueType,
          location: completingMtgEvent.location,
          maxParticipants: completingMtgEvent.maxParticipants,
          status: 'completed',
          thumbnailUrl: completingMtgEvent.thumbnailUrl,
          isRecurring: completingMtgEvent.isRecurring,
          vimeoUrl: data.vimeoUrl,
          materialsUrl: data.materialsUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'イベントの更新に失敗しました')
      }

      setShowMtgCompleteForm(false)
      setCompletingMtgEvent(null)
      await fetchEvents()
    } catch (err) {
      console.error('Failed to complete MTG event:', err)
      alert(err instanceof Error ? err.message : 'イベントの更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // イベント編集開始
  const handleEditEvent = (event: AdminEventItem) => {
    setEditingMtgEvent(event)
    setShowMtgEditForm(true)
  }

  // 全体MTG完了設定を開始
  const handleStartMtgComplete = (event: AdminEventItem) => {
    setCompletingMtgEvent(event)
    setShowMtgCompleteForm(true)
  }

  // イベント削除
  const handleDeleteEvent = async (id: string) => {
    if (!confirm('この全体MTGを削除しますか？')) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'イベントの削除に失敗しました')
      }

      setEvents(prev => prev.filter(event => event.id !== id))
    } catch (err) {
      console.error('Failed to delete event:', err)
      alert(err instanceof Error ? err.message : 'イベントの削除に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <PageHeader title="月初（全体MTG）管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">月初（全体MTG）管理</h2>
                <p className="text-slate-600">{isAdmin ? '全体MTGの作成・編集・削除' : '全体MTG参加者の確認'}</p>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => setShowMtgCreateForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  全体MTGを作成
                </Button>
              )}
            </div>

            {/* タブ切り替え */}
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'upcoming' ? 'default' : 'outline'}
                onClick={() => setActiveTab('upcoming')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                開催予定 ({upcomingEvents.length})
              </Button>
              <Button
                variant={activeTab === 'past' ? 'default' : 'outline'}
                onClick={() => setActiveTab('past')}
                className="flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                過去MTG ({pastEvents.length})
              </Button>
            </div>

            {/* エラー表示 */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* 全体MTG作成フォーム */}
            {showMtgCreateForm && (
              <MtgEventForm
                mode="create"
                onSubmit={handleCreateMtgEvent}
                onCancel={() => setShowMtgCreateForm(false)}
                isSubmitting={isSubmitting}
              />
            )}

            {/* 全体MTG編集フォーム */}
            {showMtgEditForm && editingMtgEvent && (
              <MtgEventForm
                mode="edit"
                initialData={{
                  title: editingMtgEvent.title,
                  description: editingMtgEvent.description,
                  date: editingMtgEvent.date.split('T')[0],
                  time: editingMtgEvent.time,
                  location: editingMtgEvent.location,
                  onlineMeetingUrl: editingMtgEvent.onlineMeetingUrl || '',
                  attendanceCode: editingMtgEvent.attendanceCode || '',
                  applicationDeadline: editingMtgEvent.applicationDeadline
                    ? editingMtgEvent.applicationDeadline.slice(0, 16)
                    : '',
                  vimeoUrl: editingMtgEvent.vimeoUrl || '',
                  materialsUrl: editingMtgEvent.materialsUrl || '',
                }}
                onSubmit={handleUpdateMtgEvent}
                onCancel={() => {
                  setShowMtgEditForm(false)
                  setEditingMtgEvent(null)
                }}
                isSubmitting={isSubmitting}
              />
            )}

            {/* 全体MTG完了設定フォーム */}
            {showMtgCompleteForm && completingMtgEvent && (
              <MtgEventForm
                mode="complete"
                initialData={{
                  title: completingMtgEvent.title,
                  vimeoUrl: completingMtgEvent.vimeoUrl || '',
                  materialsUrl: completingMtgEvent.materialsUrl || '',
                }}
                onSubmit={handleCompleteMtgEvent}
                onCancel={() => {
                  setShowMtgCompleteForm(false)
                  setCompletingMtgEvent(null)
                }}
                isSubmitting={isSubmitting}
              />
            )}

            {/* イベント一覧 */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center text-slate-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  読み込み中です
                </div>
              </div>
            ) : displayedEvents.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-slate-500">
                    {activeTab === 'upcoming' ? (
                      <p>開催予定の全体MTGはありません</p>
                    ) : (
                      <p>過去の全体MTGはありません</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-blue-200">
                <div className="divide-y divide-slate-100">
                  {displayedEvents.map(event => (
                    <div
                      key={event.id}
                      className="flex items-center px-4 py-3 hover:bg-blue-50 transition-colors group"
                    >
                      {/* 日付 */}
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-sm font-semibold text-slate-900">
                          {formatDate(event.date)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {event.time || '-'}
                        </div>
                      </div>

                      {/* タイトル・バッジ */}
                      <div
                        className="flex-1 ml-4 min-w-0 cursor-pointer"
                        onClick={() => router.push(`/dashboard/admin/events/${event.id}/mtg`)}
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className="bg-blue-600 text-[10px] px-1.5 py-0">
                            全体MTG
                          </Badge>
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            必須参加
                          </Badge>
                          {event.vimeoUrl && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 border-purple-200 text-purple-700">
                              <Video className="h-2.5 w-2.5 mr-0.5" />
                              録画あり
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary-600">
                          {event.title}
                        </p>
                      </div>

                      {/* 参加者数 */}
                      <div className="flex-shrink-0 mx-4 text-center">
                        <div className="flex items-center text-xs text-slate-600">
                          <Users className="h-3.5 w-3.5 mr-1" />
                          <span>{event.currentParticipants}名</span>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex-shrink-0 flex items-center gap-1">
                        {/* 完了設定ボタン（開催予定のみ） */}
                        {isAdmin && (
                          <>
                            {event.status === 'upcoming' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartMtgComplete(event)
                                }}
                                disabled={isSubmitting}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                <span className="text-xs">完了</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditEvent(event)
                              }}
                              disabled={isSubmitting}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteEvent(event.id)
                              }}
                              disabled={isSubmitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <ChevronRight
                          className="h-4 w-4 text-slate-400 group-hover:text-slate-600 cursor-pointer"
                          onClick={() => router.push(`/dashboard/admin/events/${event.id}/mtg`)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminMtgPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <AdminMtgPageContent />
    </ProtectedRoute>
  )
}
