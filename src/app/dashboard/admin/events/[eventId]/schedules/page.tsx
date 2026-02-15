'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Users,
  Link as LinkIcon,
  Save,
  X,
} from 'lucide-react'
import Link from 'next/link'

type Schedule = {
  id: string
  date: string
  time: string | null
  location: string | null
  onlineMeetingUrl: string | null
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
  attendanceCode: string | null
  _count: {
    registrations: number
    externalRegistrations: number
  }
}

type Event = {
  id: string
  title: string
  eventCategory: string
}

function ScheduleManagementContent() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  const [event, setEvent] = useState<Event | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 編集/追加モーダル
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    onlineMeetingUrl: '',
    attendanceCode: '',
    status: 'OPEN' as 'OPEN' | 'CLOSED' | 'CANCELLED',
  })
  const [isSaving, setIsSaving] = useState(false)

  const fetchSchedules = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/events/${eventId}/schedules`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '日程情報の取得に失敗しました')
      }

      setEvent(data.event)
      setSchedules(data.schedules)
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
      setError(err instanceof Error ? err.message : '日程情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (eventId) {
      fetchSchedules()
    }
  }, [eventId])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年M月d日(E)', { locale: ja })
    } catch {
      return dateString
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return '申込受付中'
      case 'CLOSED': return '申込締切'
      case 'CANCELLED': return '中止'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-50 border-green-300 text-green-700'
      case 'CLOSED': return 'bg-gray-50 border-gray-300 text-gray-700'
      case 'CANCELLED': return 'bg-red-50 border-red-300 text-red-700'
      default: return 'bg-gray-50 border-gray-300 text-gray-700'
    }
  }

  const openAddModal = () => {
    setEditingSchedule(null)
    setFormData({
      date: '',
      time: '',
      location: '',
      onlineMeetingUrl: '',
      attendanceCode: '',
      status: 'OPEN',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      date: schedule.date ? format(new Date(schedule.date), 'yyyy-MM-dd') : '',
      time: schedule.time || '',
      location: schedule.location || '',
      onlineMeetingUrl: schedule.onlineMeetingUrl || '',
      attendanceCode: schedule.attendanceCode || '',
      status: schedule.status,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.date) {
      alert('日付は必須です')
      return
    }

    setIsSaving(true)

    try {
      const url = editingSchedule
        ? `/api/admin/events/${eventId}/schedules/${editingSchedule.id}`
        : `/api/admin/events/${eventId}/schedules`

      const method = editingSchedule ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: new Date(formData.date).toISOString(),
          time: formData.time || null,
          location: formData.location || null,
          onlineMeetingUrl: formData.onlineMeetingUrl || null,
          attendanceCode: formData.attendanceCode || null,
          status: formData.status,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '保存に失敗しました')
      }

      setIsModalOpen(false)
      fetchSchedules()
    } catch (err) {
      console.error('Failed to save schedule:', err)
      alert(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId)
    const registrationCount = (schedule?._count.registrations || 0) + (schedule?._count.externalRegistrations || 0)

    if (registrationCount > 0) {
      if (!confirm(`この日程には${registrationCount}名の参加登録があります。本当に削除しますか？`)) {
        return
      }
    } else if (!confirm('この日程を削除しますか？')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}/schedules/${scheduleId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '削除に失敗しました')
      }

      fetchSchedules()
    } catch (err) {
      console.error('Failed to delete schedule:', err)
      alert(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="日程管理" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden="true" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="日程管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/dashboard/admin/events/${eventId}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                    戻る
                  </Button>
                </Link>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{event?.title}</h2>
                  <p className="text-slate-600">開催日程の管理</p>
                </div>
              </div>
              <Button onClick={openAddModal}>
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                日程を追加
              </Button>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* 日程一覧 */}
            <div className="grid gap-4">
              {schedules.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" aria-hidden="true" />
                    <p className="text-slate-600">日程が登録されていません</p>
                    <Button onClick={openAddModal} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                      日程を追加
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                schedules.map((schedule, index) => (
                  <Card key={schedule.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* 番号 */}
                          <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-semibold">
                            {index + 1}
                          </div>

                          {/* 日程情報 */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={getStatusColor(schedule.status)}>
                                {getStatusLabel(schedule.status)}
                              </Badge>
                              <span className="font-semibold text-slate-900">
                                {formatDate(schedule.date)}
                              </span>
                              {schedule.time && (
                                <span className="text-slate-600 flex items-center">
                                  <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
                                  {schedule.time}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              {schedule.location && (
                                <span className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" aria-hidden="true" />
                                  {schedule.location}
                                </span>
                              )}
                              {schedule.onlineMeetingUrl && (
                                <span className="flex items-center">
                                  <LinkIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                                  オンラインURL設定済み
                                </span>
                              )}
                              {event?.eventCategory === 'MTG' && schedule.attendanceCode && (
                                <span className="flex items-center">
                                  参加コード: <code className="ml-1 bg-slate-100 px-1 rounded">{schedule.attendanceCode}</code>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center text-sm text-slate-500">
                              <Users className="h-4 w-4 mr-1" aria-hidden="true" />
                              {schedule._count.registrations + schedule._count.externalRegistrations}名登録
                              {schedule._count.externalRegistrations > 0 && (
                                <span className="ml-1 text-slate-400">
                                  （外部{schedule._count.externalRegistrations}名）
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* アクションボタン */}
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(schedule)}>
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(schedule.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 追加/編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>{editingSchedule ? '日程を編集' : '日程を追加'}</CardTitle>
              <CardDescription>
                イベントの開催日程を{editingSchedule ? '編集' : '追加'}します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 日付 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  日付 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 時間 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  時間
                </label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  placeholder="例: 14:00〜16:00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 場所 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  開催場所
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="例: 東京会場"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* オンラインURL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  オンライン参加URL
                </label>
                <input
                  type="url"
                  value={formData.onlineMeetingUrl}
                  onChange={(e) => setFormData({ ...formData, onlineMeetingUrl: e.target.value })}
                  placeholder="例: https://zoom.us/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 参加コード（全体MTGの場合のみ表示） */}
              {event?.eventCategory === 'MTG' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    参加コード
                  </label>
                  <input
                    type="text"
                    value={formData.attendanceCode}
                    onChange={(e) => setFormData({ ...formData, attendanceCode: e.target.value.toUpperCase() })}
                    placeholder="例: ABC123"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* ステータス */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ステータス
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OPEN">申込受付中</option>
                  <option value="CLOSED">申込締切</option>
                  <option value="CANCELLED">中止</option>
                </select>
              </div>

              {/* ボタン */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                  <X className="h-4 w-4 mr-2" aria-hidden="true" />
                  キャンセル
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                  )}
                  {isSaving ? '保存中...' : '保存'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function ScheduleManagementPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <ScheduleManagementContent />
    </ProtectedRoute>
  )
}
