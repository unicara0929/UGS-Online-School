'use client'

import { useState } from 'react'
import { Loader2, FileText, Calendar, Clock, MapPin, Users, Video, Link2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/lib/constants/form-styles'

interface ArchiveEventFormData {
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
}

interface ArchiveEventFormProps {
  onSubmit: (data: ArchiveEventFormData) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function ArchiveEventForm({ onSubmit, onCancel, isSubmitting }: ArchiveEventFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    summary: '',
    vimeoUrl: '',
    materialsUrl: '',
    actualParticipants: null as number | null,
    adminNotes: '',
  })

  const handleSubmit = async () => {
    if (!formData.title || !formData.date) {
      alert('イベント名と開催日は必須です')
      return
    }

    await onSubmit(formData)
  }

  const handleParticipantsChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      actualParticipants: value === '' ? null : Number(value)
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" aria-hidden="true" />
          過去イベントを記録
        </CardTitle>
        <CardDescription>
          過去に開催したセミナーの記録を登録します（会員側には表示されません）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* イベント名 */}
            <div className="md:col-span-2">
              <label className={FORM_LABEL_CLASS}>
                イベント名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={FORM_INPUT_CLASS}
                placeholder="例: 第10回 資産形成セミナー"
              />
            </div>

            {/* 開催日 */}
            <div>
              <label className={FORM_LABEL_CLASS}>
                <Calendar className="h-4 w-4 inline mr-1" aria-hidden="true" />
                開催日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className={FORM_INPUT_CLASS}
              />
            </div>

            {/* 開催時間 */}
            <div>
              <label className={FORM_LABEL_CLASS}>
                <Clock className="h-4 w-4 inline mr-1" aria-hidden="true" />
                開催時間
              </label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                className={FORM_INPUT_CLASS}
                placeholder="例: 19:00-21:00"
              />
            </div>

            {/* 開催場所 */}
            <div>
              <label className={FORM_LABEL_CLASS}>
                <MapPin className="h-4 w-4 inline mr-1" aria-hidden="true" />
                開催場所
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className={FORM_INPUT_CLASS}
                placeholder="例: Zoom / 名古屋会議室A"
              />
            </div>

            {/* 参加人数 */}
            <div>
              <label className={FORM_LABEL_CLASS}>
                <Users className="h-4 w-4 inline mr-1" aria-hidden="true" />
                参加人数
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

            {/* 説明 */}
            <div className="md:col-span-2">
              <label className={FORM_LABEL_CLASS}>
                イベント説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className={FORM_INPUT_CLASS}
                rows={2}
                placeholder="イベントの簡単な説明"
              />
            </div>
          </div>

          {/* 実施記録 */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">実施記録</h3>
            <div className="space-y-4">
              {/* 実施内容の概要 */}
              <div>
                <label className={FORM_LABEL_CLASS}>
                  実施内容の概要
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  className={FORM_INPUT_CLASS}
                  rows={3}
                  placeholder="どんな内容を話したか、どんなワークをしたかなど"
                />
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
              </div>

              {/* 資料リンク */}
              <div>
                <label className={FORM_LABEL_CLASS}>
                  <Link2 className="h-4 w-4 inline mr-1" aria-hidden="true" />
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
                  rows={2}
                  placeholder="参加者の反応、次回への改善点など"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            ※ 写真は保存後に「記録を編集」画面からアップロードできます
          </p>
        </div>

        {/* ボタン */}
        <div className="flex gap-2 mt-6">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                保存中...
              </span>
            ) : (
              '過去イベントを登録'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
