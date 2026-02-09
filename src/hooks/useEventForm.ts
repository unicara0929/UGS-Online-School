'use client'

import { useState, useCallback } from 'react'
import type { EventFormData, AdminEventItem } from '@/types/event'
import { DEFAULT_EVENT_FORM } from '@/types/event'
import { THUMBNAIL_CONFIG } from '@/constants/event'

interface UseEventFormReturn {
  formData: EventFormData
  setFormData: (data: EventFormData) => void
  thumbnailFile: File | null
  thumbnailPreview: string | null
  isUploading: boolean
  handleThumbnailSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleThumbnailRemove: () => void
  uploadThumbnail: () => Promise<string | null>
  resetForm: () => void
  initializeFromEvent: (event: AdminEventItem) => void
}

export function useEventForm(): UseEventFormReturn {
  const [formData, setFormData] = useState<EventFormData>(DEFAULT_EVENT_FORM)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleThumbnailSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック
    if (file.size > THUMBNAIL_CONFIG.maxSize) {
      alert('ファイルサイズは5MB以下にしてください')
      return
    }

    // ファイル形式チェック
    if (!THUMBNAIL_CONFIG.allowedTypes.includes(file.type)) {
      alert('画像ファイル（JPEG、PNG、WebP）のみアップロード可能です')
      return
    }

    setThumbnailFile(file)

    // プレビュー表示
    const reader = new FileReader()
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleThumbnailRemove = useCallback(() => {
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setFormData(prev => ({ ...prev, thumbnailUrl: null }))
  }, [])

  const uploadThumbnail = useCallback(async (): Promise<string | null> => {
    if (!thumbnailFile) return formData.thumbnailUrl

    setIsUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', thumbnailFile)

      const response = await fetch('/api/admin/events/upload-thumbnail', {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'サムネイルのアップロードに失敗しました')
      }

      return data.imageUrl
    } catch (err) {
      console.error('Failed to upload thumbnail:', err)
      alert(err instanceof Error ? err.message : 'サムネイルのアップロードに失敗しました')
      return null
    } finally {
      setIsUploading(false)
    }
  }, [thumbnailFile, formData.thumbnailUrl])

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_EVENT_FORM)
    setThumbnailFile(null)
    setThumbnailPreview(null)
  }, [])

  const initializeFromEvent = useCallback((event: AdminEventItem) => {
    setFormData({
      title: event.title,
      description: event.description ?? '',
      date: event.date ? event.date.split('T')[0] : '',
      time: event.time ?? '',
      type: event.type,
      targetRoles: event.targetRoles,
      attendanceType: event.attendanceType,
      venueType: event.venueType,
      location: event.location,
      maxParticipants: event.maxParticipants,
      status: event.status,
      thumbnailUrl: event.thumbnailUrl,
      isPaid: false,
      price: null,
      // オンライン参加URL
      onlineMeetingUrl: event.onlineMeetingUrl ?? null,
      // 過去イベント記録用
      summary: event.summary,
      photos: event.photos || [],
      materialsUrl: event.materialsUrl,
      vimeoUrl: event.vimeoUrl,
      actualParticipants: event.actualParticipants,
      actualLocation: event.actualLocation,
      adminNotes: event.adminNotes,
      isArchiveOnly: event.isArchiveOnly,
      // 出席確認・全体MTG関連
      attendanceCode: event.attendanceCode ?? null,
      surveyUrl: event.surveyUrl ?? null,
      attendanceDeadline: event.attendanceDeadline ?? null,
      isRecurring: event.isRecurring ?? false,
      applicationDeadline: event.applicationDeadline ?? null,
      // 外部参加者設定
      allowExternalParticipation: event.allowExternalParticipation ?? false,
      externalRegistrationToken: event.externalRegistrationToken ?? null,
    })
    setThumbnailPreview(event.thumbnailUrl)
    setThumbnailFile(null)
  }, [])

  return {
    formData,
    setFormData,
    thumbnailFile,
    thumbnailPreview,
    isUploading,
    handleThumbnailSelect,
    handleThumbnailRemove,
    uploadThumbnail,
    resetForm,
    initializeFromEvent,
  }
}
