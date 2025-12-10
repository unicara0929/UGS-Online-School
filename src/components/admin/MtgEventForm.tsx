'use client'

import { useState } from 'react'
import { Loader2, Users, Video, FileText, Link, Calendar, Clock, MapPin, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MtgFormData {
  title: string
  description: string
  date: string
  time: string
  location: string
  maxParticipants: number | null
  attendanceCode: string
  // 完了後に設定する項目
  vimeoUrl: string
  surveyUrl: string
  materialsUrl: string
  attendanceDeadline: string
}

interface MtgEventFormProps {
  mode: 'create' | 'complete'
  initialData?: Partial<MtgFormData>
  onSubmit: (data: MtgFormData) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function MtgEventForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting
}: MtgEventFormProps) {
  const [formData, setFormData] = useState<MtgFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    date: initialData?.date || '',
    time: initialData?.time || '10:00-12:00',
    location: initialData?.location || 'オンライン（Zoom）',
    maxParticipants: initialData?.maxParticipants ?? null,
    attendanceCode: initialData?.attendanceCode || '',
    vimeoUrl: initialData?.vimeoUrl || '',
    surveyUrl: initialData?.surveyUrl || '',
    materialsUrl: initialData?.materialsUrl || '',
    attendanceDeadline: initialData?.attendanceDeadline || '',
  })

  const inputClassName = 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'

  const handleSubmit = () => {
    if (mode === 'create') {
      if (!formData.title || !formData.date) {
        alert('タイトルと日付は必須です')
        return
      }
    } else {
      if (!formData.vimeoUrl || !formData.surveyUrl || !formData.attendanceDeadline) {
        alert('動画URL、アンケートURL、視聴期限は必須です')
        return
      }
    }
    onSubmit(formData)
  }

  // ランダムな参加コードを生成
  const generateAttendanceCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, attendanceCode: code })
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600">全体MTG</Badge>
          <CardTitle>
            {mode === 'create' ? '全体MTG作成' : '全体MTG完了設定'}
          </CardTitle>
        </div>
        <CardDescription>
          {mode === 'create'
            ? '全体MTGを作成します。参加者は免除申請や参加コード入力、動画視聴で出席確認ができます。'
            : '動画・資料・アンケートを設定して、参加できなかった方が後日視聴できるようにします。'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mode === 'create' ? (
          <>
            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Users className="inline h-4 w-4 mr-1" />
                  タイトル
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={inputClassName}
                  placeholder="例: 全体MTG 2025年1月"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  開催日
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  時間
                </label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className={inputClassName}
                  placeholder="例: 10:00-12:00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  場所
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className={inputClassName}
                  placeholder="オンライン（Zoom）または会場名"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputClassName}
                  rows={3}
                  placeholder="全体MTGの内容・アジェンダなど"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  最大参加者数
                </label>
                <input
                  type="number"
                  value={formData.maxParticipants ?? ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    maxParticipants: e.target.value ? parseInt(e.target.value) : null
                  })}
                  className={inputClassName}
                  placeholder="制限なしの場合は空欄"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Key className="inline h-4 w-4 mr-1" />
                  参加コード（当日入力用）
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.attendanceCode}
                    onChange={(e) => setFormData({ ...formData, attendanceCode: e.target.value.toUpperCase() })}
                    className={inputClassName}
                    placeholder="例: ABC123"
                    maxLength={10}
                  />
                  <Button type="button" variant="outline" onClick={generateAttendanceCode}>
                    自動生成
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">当日参加者が入力するコード</p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 完了設定（動画・資料・アンケート） */}
            <div className="bg-white rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-slate-800">後日視聴用コンテンツ</h4>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Video className="inline h-4 w-4 mr-1" />
                  Vimeo動画URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.vimeoUrl}
                  onChange={(e) => setFormData({ ...formData, vimeoUrl: e.target.value })}
                  className={inputClassName}
                  placeholder="https://vimeo.com/xxxxxxxxx"
                />
                <p className="text-xs text-slate-500 mt-1">参加できなかった方が視聴する録画動画</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <FileText className="inline h-4 w-4 mr-1" />
                  資料URL
                </label>
                <input
                  type="url"
                  value={formData.materialsUrl}
                  onChange={(e) => setFormData({ ...formData, materialsUrl: e.target.value })}
                  className={inputClassName}
                  placeholder="Google Drive, Dropboxなどの共有リンク"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Link className="inline h-4 w-4 mr-1" />
                  アンケートURL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.surveyUrl}
                  onChange={(e) => setFormData({ ...formData, surveyUrl: e.target.value })}
                  className={inputClassName}
                  placeholder="Google Formなどのアンケートリンク"
                />
                <p className="text-xs text-slate-500 mt-1">動画視聴後に回答してもらうアンケート</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  視聴期限 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.attendanceDeadline}
                  onChange={(e) => setFormData({ ...formData, attendanceDeadline: e.target.value })}
                  className={inputClassName}
                />
                <p className="text-xs text-slate-500 mt-1">この期限まで動画視聴・アンケート回答で出席扱いになります</p>
              </div>
            </div>
          </>
        )}

        {/* ボタン */}
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                処理中...
              </span>
            ) : (
              mode === 'create' ? '全体MTGを作成' : '完了設定を保存'
            )}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            キャンセル
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
