'use client'

import { useEffect, useState, useMemo } from 'react'
import { Loader2, Plus, Calendar, Archive, FileText, Users } from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EventForm } from '@/components/admin/EventForm'
import { EventCard } from '@/components/admin/EventCard'
import { ArchiveEventForm } from '@/components/admin/ArchiveEventForm'
import { MtgEventForm } from '@/components/admin/MtgEventForm'
import { useEvents } from '@/hooks/useEvents'
import { useEventForm } from '@/hooks/useEventForm'
import type { AdminEventItem } from '@/types/event'

type EventTab = 'upcoming' | 'past'

function AdminEventsPageContent() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showArchiveForm, setShowArchiveForm] = useState(false)
  const [showMtgCreateForm, setShowMtgCreateForm] = useState(false)
  const [showMtgCompleteForm, setShowMtgCompleteForm] = useState(false)
  const [completingMtgEvent, setCompletingMtgEvent] = useState<AdminEventItem | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<EventTab>('upcoming')

  // カスタムフック
  const {
    events,
    isLoading,
    error,
    totalParticipants,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useEvents()

  // 新規作成フォーム用
  const createForm = useEventForm()

  // 編集フォーム用
  const editForm = useEventForm()

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

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

  // イベント作成
  const handleCreateEvent = async () => {
    if (!createForm.formData.title || !createForm.formData.date) {
      alert('イベント名と日付は必須です')
      return
    }

    setIsSubmitting(true)
    try {
      const thumbnailUrl = await createForm.uploadThumbnail()
      if (createForm.thumbnailFile && !thumbnailUrl) {
        setIsSubmitting(false)
        return
      }

      const success = await createEvent({
        ...createForm.formData,
        thumbnailUrl,
      })

      if (success) {
        createForm.resetForm()
        setShowCreateForm(false)
        await fetchEvents()
      }
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
      alert('イベント名と日付は必須です')
      return
    }

    setIsSubmitting(true)
    try {
      const thumbnailUrl = await editForm.uploadThumbnail()
      if (editForm.thumbnailFile && !thumbnailUrl) {
        setIsSubmitting(false)
        return
      }

      const success = await updateEvent(editingEventId, {
        ...editForm.formData,
        thumbnailUrl: thumbnailUrl ?? editForm.formData.thumbnailUrl,
      })

      if (success) {
        setShowEditForm(false)
        setEditingEventId(null)
        editForm.resetForm()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // イベント削除
  const handleDeleteEvent = async (id: string) => {
    setIsSubmitting(true)
    try {
      await deleteEvent(id)
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

  // 過去イベント記録作成
  const handleCreateArchiveEvent = async (data: {
    title: string
    description: string
    date: string
    time: string
    location: string
    summary: string
    vimeoUrl: string
    materialsUrl: string
    actualParticipants: number | null
    adminNotes: string
  }) => {
    setIsSubmitting(true)
    try {
      const success = await createEvent({
        ...data,
        status: 'completed',
        isArchiveOnly: true,
        targetRoles: ['all'],
        attendanceType: 'optional',
        venueType: 'online',
        maxParticipants: null,
        isPaid: false,
        price: null,
      })

      if (success) {
        setShowArchiveForm(false)
        await fetchEvents()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 全体MTG作成
  const handleCreateMtgEvent = async (data: {
    title: string
    description: string
    date: string
    time: string
    location: string
    maxParticipants: number | null
    attendanceCode: string
  }) => {
    setIsSubmitting(true)
    try {
      const success = await createEvent({
        title: data.title,
        description: data.description,
        date: data.date,
        time: data.time,
        location: data.location,
        maxParticipants: data.maxParticipants,
        attendanceCode: data.attendanceCode || null,
        status: 'upcoming',
        isRecurring: true, // 全体MTGフラグ
        targetRoles: ['all'],
        attendanceType: 'required',
        venueType: 'online',
        isPaid: false,
        price: null,
        isArchiveOnly: false,
      })

      if (success) {
        setShowMtgCreateForm(false)
        await fetchEvents()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 全体MTG完了設定
  const handleCompleteMtgEvent = async (data: {
    vimeoUrl: string
    surveyUrl: string
    materialsUrl: string
    attendanceDeadline: string
  }) => {
    if (!completingMtgEvent) return

    setIsSubmitting(true)
    try {
      const success = await updateEvent(completingMtgEvent.id, {
        ...editForm.formData,
        status: 'completed',
        vimeoUrl: data.vimeoUrl,
        surveyUrl: data.surveyUrl,
        materialsUrl: data.materialsUrl,
        attendanceDeadline: data.attendanceDeadline,
      })

      if (success) {
        setShowMtgCompleteForm(false)
        setCompletingMtgEvent(null)
        await fetchEvents()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 全体MTG完了設定を開始
  const handleStartMtgComplete = (event: AdminEventItem) => {
    setCompletingMtgEvent(event)
    setShowMtgCompleteForm(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <PageHeader title="イベント管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">イベント管理</h2>
                <p className="text-slate-600">イベントの作成・編集・削除</p>
                <p className="text-xs text-slate-400 mt-1">
                  参加者合計: {totalParticipants}名
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowMtgCreateForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  全体MTGを作成
                </Button>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  新規イベント作成
                </Button>
              </div>
            </div>

            {/* タブ切り替え */}
            <div className="flex items-center justify-between">
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
                  過去イベント ({pastEvents.length})
                </Button>
              </div>
              {activeTab === 'past' && (
                <Button
                  variant="outline"
                  onClick={() => setShowArchiveForm(true)}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  過去イベントを記録
                </Button>
              )}
            </div>

            {/* エラー表示 */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* 新規イベント作成フォーム */}
            {showCreateForm && (
              <EventForm
                title="新規イベント作成"
                formData={createForm.formData}
                onFormChange={createForm.setFormData}
                thumbnailPreview={createForm.thumbnailPreview}
                onThumbnailSelect={createForm.handleThumbnailSelect}
                onThumbnailRemove={createForm.handleThumbnailRemove}
                onSubmit={handleCreateEvent}
                onCancel={handleCancelCreate}
                isSubmitting={isSubmitting}
                isUploading={createForm.isUploading}
                submitLabel="イベント作成"
                radioGroupName="createVenueType"
              />
            )}

            {/* イベント編集フォーム */}
            {showEditForm && (
              <EventForm
                title="イベント編集"
                formData={editForm.formData}
                onFormChange={editForm.setFormData}
                thumbnailPreview={editForm.thumbnailPreview}
                onThumbnailSelect={editForm.handleThumbnailSelect}
                onThumbnailRemove={editForm.handleThumbnailRemove}
                onSubmit={handleUpdateEvent}
                onCancel={handleCancelEdit}
                isSubmitting={isSubmitting}
                isUploading={editForm.isUploading}
                submitLabel="イベント更新"
                radioGroupName="editVenueType"
              />
            )}

            {/* 過去イベント記録作成フォーム */}
            {showArchiveForm && (
              <ArchiveEventForm
                onSubmit={handleCreateArchiveEvent}
                onCancel={() => setShowArchiveForm(false)}
                isSubmitting={isSubmitting}
              />
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

            {/* 全体MTG完了設定フォーム */}
            {showMtgCompleteForm && completingMtgEvent && (
              <MtgEventForm
                mode="complete"
                initialData={{
                  title: completingMtgEvent.title,
                  vimeoUrl: completingMtgEvent.vimeoUrl || '',
                  surveyUrl: completingMtgEvent.surveyUrl || '',
                  materialsUrl: completingMtgEvent.materialsUrl || '',
                  attendanceDeadline: completingMtgEvent.attendanceDeadline || '',
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
                      <p>開催予定のイベントはありません</p>
                    ) : (
                      <p>過去のイベントはありません</p>
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
                    onMtgComplete={handleStartMtgComplete}
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

export default function AdminEventsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminEventsPageContent />
    </ProtectedRoute>
  )
}
