'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThumbnailUploader } from './ThumbnailUploader'
import type { EventFormData, TargetRole, AttendanceType, VenueType, EventStatus } from '@/types/event'
import { TARGET_ROLE_OPTIONS, VENUE_TYPE_OPTIONS, ATTENDANCE_TYPE_OPTIONS, EVENT_STATUS_OPTIONS } from '@/constants/event'

interface EventFormProps {
  title: string
  formData: EventFormData
  onFormChange: (data: EventFormData) => void
  thumbnailPreview: string | null
  onThumbnailSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onThumbnailRemove: () => void
  onSubmit: () => void
  onCancel: () => void
  isSubmitting: boolean
  isUploading: boolean
  submitLabel: string
  radioGroupName?: string
}

export function EventForm({
  title,
  formData,
  onFormChange,
  thumbnailPreview,
  onThumbnailSelect,
  onThumbnailRemove,
  onSubmit,
  onCancel,
  isSubmitting,
  isUploading,
  submitLabel,
  radioGroupName = 'venueType',
}: EventFormProps) {
  const inputClassName = 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500'

  const handleTargetRoleChange = (role: TargetRole, checked: boolean) => {
    const roles = checked
      ? [...formData.targetRoles, role]
      : formData.targetRoles.filter(r => r !== role)
    onFormChange({ ...formData, targetRoles: roles })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* サムネイル */}
          <ThumbnailUploader
            preview={thumbnailPreview}
            onSelect={onThumbnailSelect}
            onRemove={onThumbnailRemove}
          />

          {/* イベント名 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              イベント名
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => onFormChange({ ...formData, title: e.target.value })}
              className={inputClassName}
              placeholder="イベント名を入力"
            />
          </div>

          {/* 日付 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              日付
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => onFormChange({ ...formData, date: e.target.value })}
              className={inputClassName}
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
              onChange={(e) => onFormChange({ ...formData, time: e.target.value })}
              className={inputClassName}
              placeholder="例: 19:00-21:00"
            />
          </div>

          {/* 対象ロール */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              対象ロール（複数選択可）
            </label>
            <div className="space-y-2">
              {TARGET_ROLE_OPTIONS.map(role => (
                <label key={role.value} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.targetRoles.includes(role.value)}
                    onChange={(e) => handleTargetRoleChange(role.value, e.target.checked)}
                    className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 rounded focus:ring-slate-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-slate-700">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 参加設定 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              参加設定
            </label>
            <select
              value={formData.attendanceType}
              onChange={(e) => onFormChange({ ...formData, attendanceType: e.target.value as AttendanceType })}
              className={inputClassName}
            >
              {ATTENDANCE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 最大参加者数 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              最大参加者数
            </label>
            <input
              type="number"
              value={formData.maxParticipants ?? ''}
              onChange={(e) => {
                const value = e.target.value
                onFormChange({
                  ...formData,
                  maxParticipants: value === '' ? null : parseInt(value),
                })
              }}
              className={inputClassName}
              placeholder="空欄で無制限"
            />
          </div>

          {/* イベントタイプ（有料/無料） */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              イベントタイプ
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`${radioGroupName}-isPaid`}
                  checked={!formData.isPaid}
                  onChange={() => onFormChange({ ...formData, isPaid: false, price: null })}
                  className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 focus:ring-slate-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-slate-700">無料</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`${radioGroupName}-isPaid`}
                  checked={formData.isPaid}
                  onChange={() => onFormChange({ ...formData, isPaid: true })}
                  className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 focus:ring-slate-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-slate-700">有料</span>
              </label>
            </div>
          </div>

          {/* 価格（有料の場合のみ） */}
          {formData.isPaid && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                価格（円）
              </label>
              <input
                type="number"
                value={formData.price ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  onFormChange({
                    ...formData,
                    price: value === '' ? null : parseInt(value),
                  })
                }}
                className={inputClassName}
                placeholder="例: 3000"
                min="0"
              />
            </div>
          )}

          {/* 開催形式 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              開催形式
            </label>
            <div className="space-y-2">
              {VENUE_TYPE_OPTIONS.map(venue => (
                <label key={venue.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name={radioGroupName}
                    checked={formData.venueType === venue.value}
                    onChange={() => onFormChange({ ...formData, venueType: venue.value })}
                    className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 focus:ring-slate-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-slate-700">{venue.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 説明 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              説明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
              className={inputClassName}
              rows={3}
              placeholder="イベントの説明を入力"
            />
          </div>

          {/* 場所 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              場所
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => onFormChange({ ...formData, location: e.target.value })}
              className={inputClassName}
              placeholder="オンライン（Zoom）または会場名"
            />
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ステータス
            </label>
            <select
              value={formData.status}
              onChange={(e) => onFormChange({ ...formData, status: e.target.value as EventStatus })}
              className={inputClassName}
            >
              {EVENT_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 参加申込期限（全体MTGの場合のみ） */}
          {formData.isRecurring && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                参加申込期限
              </label>
              <input
                type="datetime-local"
                value={formData.applicationDeadline || ''}
                onChange={(e) => onFormChange({ ...formData, applicationDeadline: e.target.value || null })}
                className={inputClassName}
              />
              <p className="text-xs text-slate-500 mt-1">
                この期限を過ぎると「参加する」「欠席申請」ができなくなります
              </p>
            </div>
          )}
        </div>

        {/* ボタン */}
        <div className="flex gap-2 mt-4">
          <Button onClick={onSubmit} disabled={isSubmitting || isUploading}>
            {isSubmitting || isUploading ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUploading ? 'アップロード中...' : '処理中...'}
              </span>
            ) : (
              submitLabel
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isUploading}
          >
            キャンセル
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
