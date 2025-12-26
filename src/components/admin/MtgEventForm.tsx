'use client'

import { useState, useMemo } from 'react'
import { Loader2, Users, Video, FileText, Calendar, Clock, MapPin, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// 翌日23:59をデフォルト期限として取得
function getDefaultDeadline(): string {
  const now = new Date()
  // 翌日を取得
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  tomorrow.setHours(23, 59, 0, 0)
  // datetime-local形式に変換 (YYYY-MM-DDTHH:mm)
  const year = tomorrow.getFullYear()
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const day = String(tomorrow.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T23:59`
}

// 指定日の23:59をデフォルト期限として取得
function getDefaultApplicationDeadline(eventDate: string): string {
  if (!eventDate) return ''
  const date = new Date(eventDate)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T23:59`
}

interface MtgFormData {
  title: string
  description: string
  date: string
  time: string
  location: string
  attendanceCode: string
  applicationDeadline: string // 参加申込期限
  // 完了後に設定する項目
  vimeoUrl: string
  materialsUrl: string
  attendanceDeadline: string // 動画視聴+アンケート期限
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
  // 完了設定モードの場合、デフォルト期限を当月末に設定
  const defaultDeadline = useMemo(() => {
    if (mode === 'complete' && !initialData?.attendanceDeadline) {
      return getDefaultDeadline()
    }
    return initialData?.attendanceDeadline || ''
  }, [mode, initialData?.attendanceDeadline])

  const [formData, setFormData] = useState<MtgFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    date: initialData?.date || '',
    time: initialData?.time || '10:00-12:00',
    location: initialData?.location || 'オンライン（Zoom）',
    attendanceCode: initialData?.attendanceCode || '',
    applicationDeadline: initialData?.applicationDeadline || '',
    vimeoUrl: initialData?.vimeoUrl || '',
    materialsUrl: initialData?.materialsUrl || '',
    attendanceDeadline: defaultDeadline,
  })

  // 開催日が変更されたら参加申込期限を自動設定（未設定の場合のみ）
  const handleDateChange = (newDate: string) => {
    const updates: Partial<MtgFormData> = { date: newDate }
    if (!formData.applicationDeadline && newDate) {
      updates.applicationDeadline = getDefaultApplicationDeadline(newDate)
    }
    setFormData({ ...formData, ...updates })
  }

  const inputClassName = 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'

  const handleSubmit = () => {
    if (mode === 'create') {
      const missingFields: string[] = []
      if (!formData.title) missingFields.push('タイトル')
      if (!formData.date) missingFields.push('開催日')
      if (!formData.time) missingFields.push('時間')
      if (!formData.location) missingFields.push('場所')
      if (!formData.attendanceCode) missingFields.push('参加コード')
      if (!formData.applicationDeadline) missingFields.push('参加申込期限')

      if (missingFields.length > 0) {
        alert(`以下の項目は必須です:\n${missingFields.join('\n')}`)
        return
      }
    } else {
      if (!formData.vimeoUrl || !formData.attendanceDeadline) {
        alert('動画URLと視聴期限は必須です')
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
            ? '全体MTGを作成します。参加者は欠席申請や参加コード入力、動画視聴で出席確認ができます。'
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
                  タイトル <span className="text-red-500">*</span>
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
                  開催日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  時間 <span className="text-red-500">*</span>
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
                  場所 <span className="text-red-500">*</span>
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
                  <Key className="inline h-4 w-4 mr-1" />
                  参加コード（当日入力用） <span className="text-red-500">*</span>
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

              {/* 参加申込期限 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  参加申込期限 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.applicationDeadline}
                  onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                  className={inputClassName}
                />
                <p className="text-xs text-slate-500 mt-1">
                  この期限を過ぎると「参加する」「不参加」「欠席申請」ができなくなります（デフォルト: 開催日当日23:59）
                </p>
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
