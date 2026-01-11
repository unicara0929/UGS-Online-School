'use client'

import { useEffect, useState, useMemo } from 'react'
import { Loader2, Plus, Calendar, Archive, GraduationCap } from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EventForm } from '@/components/admin/EventForm'
import { EventCard } from '@/components/admin/EventCard'
import { useEventForm } from '@/hooks/useEventForm'
import type { AdminEventItem } from '@/types/event'

type EventTab = 'upcoming' | 'past'

function AdminTrainingPageContent() {
  const [events, setEvents] = useState<AdminEventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<EventTab>('upcoming')

  // フォーム用
  const createForm = useEventForm()
  const editForm = useEventForm()

  const fetchEvents = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/events?category=TRAINING', {
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
      console.error('Failed to fetch training events:', err)
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

  // 研修作成
  const handleCreateEvent = async () => {
    if (!createForm.formData.title || !createForm.formData.date) {
      alert('研修名と日付は必須です')
      return
    }

    setIsSubmitting(true)
    try {
      const thumbnailUrl = await createForm.uploadThumbnail()
      if (createForm.thumbnailFile && !thumbnailUrl) {
        setIsSubmitting(false)
        return
      }

      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...createForm.formData,
          thumbnailUrl,
          eventCategory: 'TRAINING',
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '研修の作成に失敗しました')
      }

      createForm.resetForm()
      setShowCreateForm(false)
      await fetchEvents()
    } catch (err) {
      console.error('Failed to create training event:', err)
      alert(err instanceof Error ? err.message : '研修の作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // イベント編集開始
  const handleEditEvent = (event: AdminEventItem) => {
    setEditingEventId(event.id)
    editForm.initializeFromEvent(event)
    setShowEditForm(true)
  }

  // イベント更新
  const handleUpdateEvent = async () => {
    if (!editForm.formData.title || !editForm.formData.date || !editingEventId) {
      alert('研修名と日付は必須です')
      return
    }

    setIsSubmitting(true)
    try {
      const thumbnailUrl = await editForm.uploadThumbnail()
      if (editForm.thumbnailFile && !thumbnailUrl) {
        setIsSubmitting(false)
        return
      }

      const response = await fetch(`/api/admin/events/${editingEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...editForm.formData,
          thumbnailUrl: thumbnailUrl ?? editForm.formData.thumbnailUrl,
          eventCategory: 'TRAINING',
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '研修の更新に失敗しました')
      }

      setShowEditForm(false)
      setEditingEventId(null)
      editForm.resetForm()
      await fetchEvents()
    } catch (err) {
      console.error('Failed to update training event:', err)
      alert(err instanceof Error ? err.message : '研修の更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // イベント削除
  const handleDeleteEvent = async (id: string) => {
    if (!confirm('この研修を削除しますか？')) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '研修の削除に失敗しました')
      }

      setEvents(prev => prev.filter(event => event.id !== id))
    } catch (err) {
      console.error('Failed to delete event:', err)
      alert(err instanceof Error ? err.message : '研修の削除に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 作成フォームキャンセル
  const handleCancelCreate = () => {
    setShowCreateForm(false)
    createForm.resetForm()
  }

  // 編集フォームキャンセル
  const handleCancelEdit = () => {
    setShowEditForm(false)
    setEditingEventId(null)
    editForm.resetForm()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <PageHeader title="研修管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">研修管理</h2>
                <p className="text-slate-600">研修の作成・編集・削除</p>
              </div>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                研修を作成
              </Button>
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
                過去研修 ({pastEvents.length})
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

            {/* 研修作成フォーム */}
            {showCreateForm && (
              <EventForm
                title="研修作成"
                formData={createForm.formData}
                onFormChange={createForm.setFormData}
                thumbnailPreview={createForm.thumbnailPreview}
                onThumbnailSelect={createForm.handleThumbnailSelect}
                onThumbnailRemove={createForm.handleThumbnailRemove}
                onSubmit={handleCreateEvent}
                onCancel={handleCancelCreate}
                isSubmitting={isSubmitting}
                isUploading={createForm.isUploading}
                submitLabel="研修作成"
                radioGroupName="createVenueType"
              />
            )}

            {/* 研修編集フォーム */}
            {showEditForm && (
              <EventForm
                title="研修編集"
                formData={editForm.formData}
                onFormChange={editForm.setFormData}
                thumbnailPreview={editForm.thumbnailPreview}
                onThumbnailSelect={editForm.handleThumbnailSelect}
                onThumbnailRemove={editForm.handleThumbnailRemove}
                onSubmit={handleUpdateEvent}
                onCancel={handleCancelEdit}
                isSubmitting={isSubmitting}
                isUploading={editForm.isUploading}
                submitLabel="研修更新"
                radioGroupName="editVenueType"
              />
            )}

            {/* 研修一覧 */}
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
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    {activeTab === 'upcoming' ? (
                      <p>開催予定の研修はありません</p>
                    ) : (
                      <p>過去の研修はありません</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {displayedEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    isSubmitting={isSubmitting}
                    showArchiveInfo={activeTab === 'past'}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminTrainingPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminTrainingPageContent />
    </ProtectedRoute>
  )
}
