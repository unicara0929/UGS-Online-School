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
  Settings,
} from 'lucide-react'
import Link from 'next/link'
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
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // フォーム状態
  const [formData, setFormData] = useState({
    summary: '',
    photos: [] as string[],
    materialsUrl: '',
    vimeoUrl: '',
    attendanceCode: '',
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
        attendanceCode: foundEvent.attendanceCode || '',
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

  // 資料PDFアップロード
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルタイプチェック
    if (file.type !== 'application/pdf') {
      alert('PDFファイルのみアップロード可能です')
      return
    }

    // ファイルサイズチェック（20MB）
    if (file.size > 20 * 1024 * 1024) {
      alert('ファイルサイズは20MB以下にしてください')
      return
    }

    setIsUploadingPdf(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('eventId', eventId)

      const response = await fetch('/api/admin/events/upload-materials', {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '資料のアップロードに失敗しました')
      }

      setFormData(prev => ({
        ...prev,
        materialsUrl: data.materialsUrl,
      }))
      setSuccessMessage('資料をアップロードしました')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Failed to upload PDF:', err)
      alert(err instanceof Error ? err.message : '資料のアップロードに失敗しました')
    } finally {
      setIsUploadingPdf(false)
      // input をリセット
      e.target.value = ''
    }
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
          attendanceCode: formData.attendanceCode || null,
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
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="過去イベント記録" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center text-slate-500">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
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
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="過去イベント記録" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4">
                <p className="text-sm text-red-600">{error}</p>
              </CardContent>
            </Card>
            <div className="mt-4">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
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
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="過去イベント記録" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 戻るボタン */}
            <Button variant="outline" onClick={() => router.push('/dashboard/admin/events')}>
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
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
                  <p role="alert" className="text-sm text-red-600">{error}</p>
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
                    <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                    {event && formatDate(event.date)}
                  </div>
                  <div className="flex items-center text-slate-600">
                    <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
                    {event?.time || '時間未定'}
                  </div>
                  <div className="flex items-center text-slate-600">
                    <MapPin className="h-4 w-4 mr-2" aria-hidden="true" />
                    {event?.location || '未設定'}
                  </div>
                  <div className="flex items-center text-slate-600">
                    <Users className="h-4 w-4 mr-2" aria-hidden="true" />
                    申込: {event?.currentParticipants}名
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 実施結果入力フォーム */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" aria-hidden="true" />
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
                        <Users className="h-4 w-4 inline mr-1" aria-hidden="true" />
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
                        <MapPin className="h-4 w-4 inline mr-1" aria-hidden="true" />
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

                  {/* 出席確認設定 */}
                  <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-slate-900">出席確認設定</h4>

                    {/* 参加コード */}
                    <div>
                      <label className={FORM_LABEL_CLASS}>
                        参加コード（リアルタイム参加用）
                      </label>
                      <input
                        type="text"
                        value={formData.attendanceCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, attendanceCode: e.target.value.toUpperCase() }))}
                        className={FORM_INPUT_CLASS}
                        placeholder="例: TESTMTG"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        イベント当日に会場/オンラインで表示するコード。参加者はこのコードを入力して出席を記録します。
                      </p>
                    </div>

                    {/* Vimeo URL */}
                    <div>
                      <label className={FORM_LABEL_CLASS}>
                        <Video className="h-4 w-4 inline mr-1" aria-hidden="true" />
                        録画動画URL（Vimeo等）
                      </label>
                      <input
                        type="url"
                        value={formData.vimeoUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, vimeoUrl: e.target.value }))}
                        className={FORM_INPUT_CLASS}
                        placeholder="https://vimeo.com/..."
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        後日視聴用の録画URL。設定すると参加者が録画視聴で出席を記録できます。
                      </p>
                    </div>

                    {/* アンケート設定 */}
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-900">アンケート設定</p>
                          <p className="text-xs text-purple-700 mt-1">
                            アンケートはアプリ内で作成・管理できます。録画視聴+アンケート回答で出席完了となります。
                          </p>
                        </div>
                        <Link href={`/dashboard/admin/events/${eventId}/survey`}>
                          <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                            <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                            アンケート設定
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* 資料リンク/アップロード */}
                  <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-slate-900">セミナー資料</h4>

                    {/* 現在の資料URL表示 */}
                    {formData.materialsUrl && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">現在設定中の資料URL</p>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          <a
                            href={formData.materialsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline truncate"
                          >
                            {formData.materialsUrl}
                          </a>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, materialsUrl: '' }))}
                            className="text-red-500 hover:text-red-700 ml-2 p-2 rounded-full hover:bg-red-100 cursor-pointer"
                            title="資料URLをクリア"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PDFアップロード */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        PDFファイルをアップロード
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={handlePdfUpload}
                            className="hidden"
                            disabled={isUploadingPdf}
                          />
                          <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-lg hover:border-slate-500 transition-colors">
                            {isUploadingPdf ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                アップロード中...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" aria-hidden="true" />
                                PDFを選択
                              </>
                            )}
                          </div>
                        </label>
                        <span className="text-xs text-slate-500">
                          PDF形式（20MB以下）
                        </span>
                      </div>
                    </div>

                    {/* または外部URL入力 */}
                    <div>
                      <label className={FORM_LABEL_CLASS}>
                        <Link2 className="h-4 w-4 inline mr-1" aria-hidden="true" />
                        または外部URLを指定
                      </label>
                      <input
                        type="url"
                        value={formData.materialsUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, materialsUrl: e.target.value }))}
                        className={FORM_INPUT_CLASS}
                        placeholder="https://drive.google.com/..."
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Google Drive、Dropbox、その他の共有リンクも利用可能です
                      </p>
                    </div>
                  </div>

                  {/* 当日の写真 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <ImageIcon className="h-4 w-4 inline mr-1" aria-hidden="true" />
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
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
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
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              アップロード中...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" aria-hidden="true" />
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
                      <MessageSquare className="h-4 w-4 inline mr-1" aria-hidden="true" />
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
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" aria-hidden="true" />
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
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <EventArchivePageContent />
    </ProtectedRoute>
  )
}
