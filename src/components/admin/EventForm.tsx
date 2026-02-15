'use client'

import { Loader2, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThumbnailUploader } from './ThumbnailUploader'
import type { EventFormData, TargetRole, AttendanceType, VenueType, EventStatus, RegistrationFormField, RegistrationFieldType } from '@/types/event'
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
  /** Card ラッパーなしで描画（モーダル内で使用） */
  noCard?: boolean
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
  noCard = false,
}: EventFormProps) {
  const inputClassName = 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500'

  const FIELD_TYPE_OPTIONS: { value: RegistrationFieldType; label: string }[] = [
    { value: 'TEXT', label: 'テキスト' },
    { value: 'TEXTAREA', label: 'テキストエリア' },
    { value: 'SELECT', label: 'セレクト' },
    { value: 'MULTI_SELECT', label: '複数選択' },
    { value: 'RADIO', label: 'ラジオボタン' },
    { value: 'DATE', label: '日付' },
    { value: 'RATING', label: '5段階評価' },
  ]

  const handleExternalToggle = (checked: boolean) => {
    const update: Partial<EventFormData> = {
      ...formData,
      allowExternalParticipation: checked,
    }
    // 初めてONにした時、externalFormFieldsがnullなら紹介者フィールドをデフォルトセット
    if (checked && !formData.externalFormFields) {
      update.externalFormFields = [{
        id: crypto.randomUUID(),
        label: '紹介者',
        type: 'TEXT',
        required: false,
        placeholder: '紹介者のお名前（任意）',
      }]
    }
    onFormChange(update as EventFormData)
  }

  const addCustomField = () => {
    const fields = formData.externalFormFields || []
    onFormChange({
      ...formData,
      externalFormFields: [
        ...fields,
        {
          id: crypto.randomUUID(),
          label: '',
          type: 'TEXT',
          required: false,
        },
      ],
    })
  }

  const updateCustomField = (index: number, updates: Partial<RegistrationFormField>) => {
    const fields = [...(formData.externalFormFields || [])]
    fields[index] = { ...fields[index], ...updates }
    onFormChange({ ...formData, externalFormFields: fields })
  }

  const removeCustomField = (index: number) => {
    const fields = (formData.externalFormFields || []).filter((_, i) => i !== index)
    onFormChange({ ...formData, externalFormFields: fields.length > 0 ? fields : null })
  }

  const moveCustomField = (index: number, direction: 'up' | 'down') => {
    const fields = [...(formData.externalFormFields || [])]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= fields.length) return
    ;[fields[index], fields[newIndex]] = [fields[newIndex], fields[index]]
    onFormChange({ ...formData, externalFormFields: fields })
  }

  const updateFieldOption = (fieldIndex: number, optIndex: number, value: string) => {
    const fields = [...(formData.externalFormFields || [])]
    const options = [...(fields[fieldIndex].options || [])]
    options[optIndex] = value
    fields[fieldIndex] = { ...fields[fieldIndex], options }
    onFormChange({ ...formData, externalFormFields: fields })
  }

  const addFieldOption = (fieldIndex: number) => {
    const fields = [...(formData.externalFormFields || [])]
    const options = [...(fields[fieldIndex].options || []), '']
    fields[fieldIndex] = { ...fields[fieldIndex], options }
    onFormChange({ ...formData, externalFormFields: fields })
  }

  const removeFieldOption = (fieldIndex: number, optIndex: number) => {
    const fields = [...(formData.externalFormFields || [])]
    const options = (fields[fieldIndex].options || []).filter((_, i) => i !== optIndex)
    fields[fieldIndex] = { ...fields[fieldIndex], options }
    onFormChange({ ...formData, externalFormFields: fields })
  }

  const handleTargetRoleChange = (role: TargetRole, checked: boolean) => {
    const roles = checked
      ? [...formData.targetRoles, role]
      : formData.targetRoles.filter(r => r !== role)
    onFormChange({ ...formData, targetRoles: roles })
  }

  const formContent = (
    <>
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

          {/* オンライン参加URL */}
          {(formData.venueType === 'online' || formData.venueType === 'hybrid') && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                オンライン参加URL
              </label>
              <input
                type="url"
                value={formData.onlineMeetingUrl || ''}
                onChange={(e) => onFormChange({ ...formData, onlineMeetingUrl: e.target.value || null })}
                className={inputClassName}
                placeholder="例: https://meet.google.com/xxx-xxxx-xxx"
              />
              <p className="text-xs text-slate-500 mt-1">
                Google Meet、Zoom等のオンライン会議URLを入力してください
              </p>
            </div>
          )}

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

          {/* 外部参加者設定 */}
          <div className="md:col-span-2 pt-4 border-t">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowExternalParticipation}
                onChange={(e) => handleExternalToggle(e.target.checked)}
                className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 rounded focus:ring-slate-500 focus:ring-2"
              />
              <span className="ml-2 text-sm font-medium text-slate-700">
                外部参加者を許可する
              </span>
            </label>
            <p className="text-xs text-slate-500 mt-1 ml-6">
              ONにすると、アプリ未登録のユーザーも申し込み可能な公開URLが発行されます
            </p>

            {formData.allowExternalParticipation && formData.externalRegistrationToken && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-700 font-medium mb-1">公開登録URL:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/events/${formData.externalRegistrationToken}/register`}
                    className="flex-1 text-sm px-2 py-1 bg-white border border-slate-200 rounded"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = `${window.location.origin}/events/${formData.externalRegistrationToken}/register`
                      navigator.clipboard.writeText(url)
                      alert('URLをコピーしました')
                    }}
                  >
                    コピー
                  </Button>
                </div>
              </div>
            )}

            {/* カスタムフィールドビルダー */}
            {formData.allowExternalParticipation && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-slate-700">登録フォームのカスタム項目</h4>
                  <Button type="button" size="sm" variant="outline" onClick={addCustomField}>
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                    項目追加
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  名前・メール・電話番号は固定表示です。追加項目を自由に設定できます。
                </p>

                {(formData.externalFormFields || []).map((field, index) => (
                  <div key={field.id} className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveCustomField(index, 'up')}
                          disabled={index === 0}
                          className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5"
                          aria-label="上に移動"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCustomField(index, 'down')}
                          disabled={index === (formData.externalFormFields || []).length - 1}
                          className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5"
                          aria-label="下に移動"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateCustomField(index, { label: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="項目名"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const newType = e.target.value as RegistrationFieldType
                          const needsOptions = ['SELECT', 'MULTI_SELECT', 'RADIO'].includes(newType)
                          updateCustomField(index, {
                            type: newType,
                            options: needsOptions && !field.options?.length ? [''] : field.options,
                          })
                        }}
                        className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        {FIELD_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateCustomField(index, { required: e.target.checked })}
                          className="w-3.5 h-3.5 text-slate-600 bg-slate-100 border-slate-300 rounded focus:ring-slate-500"
                        />
                        必須
                      </label>
                      <button
                        type="button"
                        onClick={() => removeCustomField(index)}
                        className="text-red-400 hover:text-red-600 p-1"
                        aria-label="項目を削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* 説明文（オプション） */}
                    <input
                      type="text"
                      value={field.description || ''}
                      onChange={(e) => updateCustomField(index, { description: e.target.value || undefined })}
                      className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="説明文（任意）"
                    />

                    {/* プレースホルダー（TEXT/TEXTAREA） */}
                    {(field.type === 'TEXT' || field.type === 'TEXTAREA') && (
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateCustomField(index, { placeholder: e.target.value || undefined })}
                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="プレースホルダー（任意）"
                      />
                    )}

                    {/* 選択肢（SELECT/MULTI_SELECT/RADIO） */}
                    {['SELECT', 'MULTI_SELECT', 'RADIO'].includes(field.type) && (
                      <div className="space-y-2 pl-6">
                        <p className="text-xs text-slate-500">選択肢:</p>
                        {(field.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateFieldOption(index, optIdx, e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-500"
                              placeholder={`選択肢${optIdx + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => removeFieldOption(index, optIdx)}
                              className="text-red-400 hover:text-red-600 p-0.5"
                              aria-label="選択肢を削除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addFieldOption(index)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          + 選択肢を追加
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* ボタン */}
      <div className="flex gap-2 mt-4">
        <Button onClick={onSubmit} disabled={isSubmitting || isUploading}>
          {isSubmitting || isUploading ? (
            <span className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
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
    </>
  )

  if (noCard) {
    return formContent
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  )
}
