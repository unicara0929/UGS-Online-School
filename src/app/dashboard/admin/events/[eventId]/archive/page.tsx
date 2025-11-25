'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  ArrowLeft,
  Loader2,
  Save,
  Upload,
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  FileText,
  Image as ImageIcon,
  Link2,
  MessageSquare,
} from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getEventStatusLabel } from '@/constants/event'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/lib/constants/form-styles'
import { validateImageFile } from '@/lib/utils/file-validation'
import type { AdminEventItem } from '@/types/event'

function EventArchivePageContent() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  const [event, setEvent] = useState<AdminEventItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // フォーム状態
  const [formData, setFormData] = useState({
    summary: '',
    photos: [] as string[],
    materialsUrl: '',
    vimeoUrl: '',
    actualParticipants: null as number | null,
    actualLocation: '',
    adminNotes: '',
  })

  // イベント取得
  const fetchEvent = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/events', {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'イベント情報の取得に失敗しました')
      }

      const foundEvent = data.events.find((e: AdminEventItem) => e.id === eventId)
      if (!foundEvent) {
        throw new Error('イベントが見つかりません')
      }

      setEvent(foundEvent)
      setFormData({
        summary: foundEvent.summary || '',
        photos: foundEvent.photos || [],
        materialsUrl: foundEvent.materialsUrl || '',
        vimeoUrl: foundEvent.vimeoUrl || '',
        actualParticipants: foundEvent.actualParticipants ?? null,
        actualLocation: foundEvent.actualLocation || '',
        adminNotes: foundEvent.adminNotes || '',
      })
    } catch (err) {
      console.error('Failed to fetch event:', err)
      setError(err instanceof Error ? err.message : 'イベント情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  // 写真アップロード
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルバリデーション
    const validation = validateImageFile(file)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    setIsUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('eventId', eventId)

      const response = await fetch('/api/admin/events/upload-photo', {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '写真のアップロードに失敗しました')
      }

      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, data.imageUrl],
      }))
    } catch (err) {
      console.error('Failed to upload photo:', err)
      alert(err instanceof Error ? err.message : '写真のアップロードに失敗しました')
    } finally {
      setIsUploading(false)
      // input をリセット
      e.target.value = ''
    }
  }

  // 写真削除
  const handlePhotoRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }))
  }

  // 保存
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          summary: formData.summary || null,
          photos: formData.photos,
          materialsUrl: formData.materialsUrl || null,
          vimeoUrl: formData.vimeoUrl || null,
          actualParticipants: formData.actualParticipants,
          actualLocation: formData.actualLocation || null,
          adminNotes: formData.adminNotes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '保存に失敗しました')
      }

      setSuccessMessage('記録を保存しました')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Failed to save:', err)
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年M月d日(E)', { locale: ja })
    } catch {
      return dateString
    }
  }

  const handleParticipantsChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      actualParticipants: value === '' ? null : Number(value)
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="過去イベント記録" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center text-slate-500">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                読み込み中です
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="過去イベント記録" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4">
                <p className="text-sm text-red-600">{error}</p>
              </CardContent>
            </Card>
            <div className="mt-4">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <PageHeader title="過去イベント記録" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 戻るボタン */}
            <Button variant="outline" onClick={() => router.push('/dashboard/admin/events')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              イベント一覧に戻る
            </Button>

            {/* 成功メッセージ */}
            {successMessage && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-4">
                  <p className="text-sm text-green-600">{successMessage}</p>
                </CardContent>
              </Card>
            )}

            {/* エラーメッセージ */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* イベント基本情報 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{event?.title}</CardTitle>
                    <CardDescription>{event?.description}</CardDescription>
                  </div>
                  <Badge variant={event?.status === 'completed' ? 'default' : 'secondary'}>
                    {getEventStatusLabel(event?.status || 'upcoming')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center text-slate-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {event && formatDate(event.date)}
                  </div>
                  <div className="flex items-center text-slate-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {event?.time || '時間未定'}
                  </div>
                  <div className="flex items-center text-slate-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event?.location || '未設定'}
                  </div>
                  <div className="flex items-center text-slate-600">
                    <Users className="h-4 w-4 mr-2" />
                    申込: {event?.currentParticipants}名
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 実施結果入力フォーム */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  実施結果
                </CardTitle>
                <CardDescription>
                  イベント終了後の記録を入力してください
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 実施内容の概要 */}
                  <div>
                    <label className={FORM_LABEL_CLASS}>
                      実施内容の概要
                    </label>
                    <textarea
                      value={formData.summary}
                      onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                      className={FORM_INPUT_CLASS}
                      rows={4}
                      placeholder="どんな内容を話したか、どんなワークをしたかなど"
                    />
                  </div>

                  {/* 実参加人数 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={FORM_LABEL_CLASS}>
                        <Users className="h-4 w-4 inline mr-1" />
                        実参加人数
                      </label>
                      <input
                        type="number"
                        value={formData.actualParticipants ?? ''}
                        onChange={(e) => handleParticipantsChange(e.target.value)}
                        className={FORM_INPUT_CLASS}
                        placeholder="例: 25"
                        min="0"
                      />
                    </div>

                    {/* 最終的な会場情報 */}
                    <div>
                      <label className={FORM_LABEL_CLASS}>
                        <MapPin className="h-4 w-4 inline mr-1" />
                        最終的な開催場所
                      </label>
                      <input
                        type="text"
                        value={formData.actualLocation}
                        onChange={(e) => setFormData(prev => ({ ...prev, actualLocation: e.target.value }))}
                        className={FORM_INPUT_CLASS}
                        placeholder="例: Zoom / 名古屋会議室A"
                      />
                    </div>
                  </div>

                  {/* Vimeo URL */}
                  <div>
                    <label className={FORM_LABEL_CLASS}>
                      <Video className="h-4 w-4 inline mr-1" />
                      録画動画URL（Vimeo等）
                    </label>
                    <input
                      type="url"
                      value={formData.vimeoUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, vimeoUrl: e.target.value }))}
                      className={FORM_INPUT_CLASS}
                      placeholder="https://vimeo.com/..."
                    />
                  </div>

                  {/* 資料リンク */}
                  <div>
                    <label className={FORM_LABEL_CLASS}>
                      <Link2 className="h-4 w-4 inline mr-1" />
                      セミナー資料リンク（PDF等）
                    </label>
                    <input
                      type="url"
                      value={formData.materialsUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, materialsUrl: e.target.value }))}
                      className={FORM_INPUT_CLASS}
                      placeholder="https://drive.google.com/..."
                    />
                  </div>

                  {/* 当日の写真 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <ImageIcon className="h-4 w-4 inline mr-1" />
                      当日の写真
                    </label>

                    {/* 写真一覧 */}
                    {formData.photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {formData.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`写真 ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => handlePhotoRemove(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* アップロードボタン */}
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-lg hover:border-slate-500 transition-colors">
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              アップロード中...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              写真を追加
                            </>
                          )}
                        </div>
                      </label>
                      <span className="text-xs text-slate-500">
                        JPEG, PNG, WebP, GIF（10MB以下）
                      </span>
                    </div>
                  </div>

                  {/* 管理者メモ */}
                  <div>
                    <label className={FORM_LABEL_CLASS}>
                      <MessageSquare className="h-4 w-4 inline mr-1" />
                      管理者用メモ
                    </label>
                    <textarea
                      value={formData.adminNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
                      className={FORM_INPUT_CLASS}
                      rows={3}
                      placeholder="参加者の反応、次回への改善点など（管理者のみ閲覧可能）"
                    />
                  </div>
                </div>

                {/* 保存ボタン */}
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        記録を保存
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function EventArchivePage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <EventArchivePageContent />
    </ProtectedRoute>
  )
}
