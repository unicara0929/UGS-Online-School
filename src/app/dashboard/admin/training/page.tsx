'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Loader2, Plus, Calendar, Archive, GraduationCap, Users, Edit, Trash2, ChevronRight, Video, MapPin } from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/contexts/auth-context'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { EventForm } from '@/components/admin/EventForm'
import { useEventForm } from '@/hooks/useEventForm'
import type { AdminEventItem } from '@/types/event'
import { getTargetRoleLabel, getAttendanceTypeLabel } from '@/constants/event'

type EventTab = 'upcoming' | 'past'

function AdminTrainingPageContent() {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
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
        schedules: event.schedules || [],
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
        // 有料設定
        isPaid: event.isPaid || false,
        price: event.price ?? null,
        // 外部参加者設定
        allowExternalParticipation: event.allowExternalParticipation || false,
        externalRegistrationToken: event.externalRegistrationToken || null,
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

      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="イベント・研修管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">イベント・研修管理</h2>
                <p className="text-slate-600">{isAdmin ? 'イベント・研修の作成・編集・削除' : 'イベント・研修参加者の確認'}</p>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  新規作成
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
                <Calendar className="h-4 w-4" aria-hidden="true" />
                開催予定 ({upcomingEvents.length})
              </Button>
              <Button
                variant={activeTab === 'past' ? 'default' : 'outline'}
                onClick={() => setActiveTab('past')}
                className="flex items-center gap-2"
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                過去研修 ({pastEvents.length})
              </Button>
            </div>

            {/* エラー表示 */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p role="alert" className="text-sm text-red-600">{error}</p>
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

            {/* 研修編集フォーム（モーダル） */}
            <Dialog open={showEditForm} onOpenChange={(open) => { if (!open) handleCancelEdit() }}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>研修編集</DialogTitle>
                  <DialogDescription>研修情報を編集して更新してください</DialogDescription>
                </DialogHeader>
                <EventForm
                  title=""
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
                  noCard
                />
              </DialogContent>
            </Dialog>

            {/* 研修一覧 */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center text-slate-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                  読み込み中です
                </div>
              </div>
            ) : displayedEvents.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-slate-500">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
                    {activeTab === 'upcoming' ? (
                      <p>開催予定の研修はありません</p>
                    ) : (
                      <p>過去の研修はありません</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-emerald-200">
                <div className="divide-y divide-slate-100">
                  {displayedEvents.map(event => (
                    <div
                      key={event.id}
                      className="flex items-center px-4 py-3 hover:bg-emerald-50 transition-colors group"
                    >
                      {/* タイトル・バッジ */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => router.push(`/dashboard/admin/events/${event.id}?from=training`)}
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className="bg-emerald-600 text-[10px] px-1.5 py-0">
                            研修
                          </Badge>
                          {event.targetRoles.map(role => (
                            <Badge key={role} variant="outline" className="text-[10px] px-1.5 py-0">
                              {getTargetRoleLabel(role)}
                            </Badge>
                          ))}
                          <Badge
                            variant={event.attendanceType === 'required' ? 'destructive' : 'secondary'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {getAttendanceTypeLabel(event.attendanceType)}
                          </Badge>
                          {event.venueType === 'online' && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 border-blue-200 text-blue-700">
                              <Video className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                              オンライン
                            </Badge>
                          )}
                          {event.venueType === 'offline' && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 border-green-200 text-green-700">
                              <MapPin className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                              オフライン
                            </Badge>
                          )}
                          {event.schedules && event.schedules.length > 1 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 border-purple-200 text-purple-700">
                              {event.schedules.length}日程
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900 group-hover:text-primary-600">
                          {event.title}
                        </p>
                      </div>

                      {/* 参加者数 */}
                      <div className="flex-shrink-0 mx-4 text-center">
                        <div className="flex items-center text-xs text-slate-600">
                          <Users className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                          <span>{event.currentParticipants}名</span>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {isAdmin && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditEvent(events.find(e => e.id === event.id)!)
                              }}
                              disabled={isSubmitting}
                            >
                              <Edit className="h-4 w-4" aria-hidden="true" />
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
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </>
                        )}
                        <ChevronRight
                          className="h-4 w-4 text-slate-400 group-hover:text-slate-600 cursor-pointer"
                          onClick={() => router.push(`/dashboard/admin/events/${event.id}?from=training`)} aria-hidden="true"
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

export default function AdminTrainingPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <AdminTrainingPageContent />
    </ProtectedRoute>
  )
}
