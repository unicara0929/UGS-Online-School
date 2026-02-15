'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

type RegistrationFormField = {
  id: string
  label: string
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTI_SELECT' | 'RADIO' | 'DATE' | 'RATING'
  required: boolean
  description?: string
  options?: string[]
  placeholder?: string
}

type Schedule = {
  id: string
  date: string
  time: string | null
  location: string | null
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
  registrationCount: number
}

interface EventInfo {
  id: string
  title: string
  description: string | null
  date: string
  time: string | null
  location: string | null
  venueType: string
  thumbnailUrl: string | null
  isPaid: boolean
  price: number | null
  currentParticipants: number
  applicationDeadlineDays: number | null
  status: string
  schedules: Schedule[]
  externalFormFields: RegistrationFormField[] | null
}

export default function ExternalEventRegisterPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string
  const canceled = searchParams.get('canceled')

  const [event, setEvent] = useState<EventInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)

  // フォーム
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [referrer, setReferrer] = useState('')
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/public/events/${token}`)
        const data = await response.json()

        if (!data.success) {
          setError(data.error || 'イベント情報の取得に失敗しました')
          return
        }

        setEvent(data.event)

        // 日程選択の初期化：最初のOPENスケジュールを選択
        const schedules = data.event.schedules as Schedule[]
        if (schedules && schedules.length > 0) {
          const firstOpen = schedules.find(s => s.status === 'OPEN' && !isScheduleDeadlinePassed(s, data.event.applicationDeadlineDays))
          setSelectedScheduleId(firstOpen?.id ?? schedules[0].id)
        }
      } catch (err) {
        console.error('Error fetching event:', err)
        setError('イベント情報の取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [token])

  const isScheduleDeadlinePassed = (schedule: Schedule, applicationDeadlineDays: number | null) => {
    if (applicationDeadlineDays === null) return false
    const deadline = new Date(schedule.date)
    deadline.setDate(deadline.getDate() - applicationDeadlineDays)
    return new Date() > deadline
  }

  const isScheduleSelectable = (schedule: Schedule) => {
    if (!event) return false
    if (schedule.status !== 'OPEN') return false
    if (isScheduleDeadlinePassed(schedule, event.applicationDeadlineDays)) return false
    return true
  }

  // 選択中のスケジュール情報を取得
  const selectedSchedule = event?.schedules.find(s => s.id === selectedScheduleId) ?? null
  const displayDate = selectedSchedule?.date ?? event?.date ?? ''
  const displayTime = selectedSchedule?.time ?? event?.time ?? null
  const displayLocation = selectedSchedule?.location ?? event?.location ?? null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // バリデーション
    if (!name.trim()) {
      setFormError('名前を入力してください')
      return
    }
    if (!email.trim()) {
      setFormError('メールアドレスを入力してください')
      return
    }
    if (!phone.trim()) {
      setFormError('電話番号を入力してください')
      return
    }

    // 複数日程がある場合、日程が選択されているか確認
    if (event && event.schedules.length > 1 && !selectedScheduleId) {
      setFormError('参加日程を選択してください')
      return
    }

    // カスタムフィールドの必須チェック
    if (event?.externalFormFields) {
      for (const field of event.externalFormFields) {
        if (field.required) {
          const value = customAnswers[field.id]
          if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
            setFormError(`${field.label}は必須です`)
            return
          }
        }
      }
    }

    setIsSubmitting(true)

    try {
      // Build customFieldAnswers from custom fields, or fall back to referrer for legacy
      const hasCustomFields = event?.externalFormFields !== null
      const response = await fetch(`/api/public/events/${token}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          referrer: hasCustomFields ? undefined : (referrer.trim() || null),
          scheduleId: selectedScheduleId,
          customFieldAnswers: hasCustomFields ? customAnswers : undefined,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setFormError(data.error || '登録に失敗しました')
        return
      }

      // 有料イベントの場合はStripeへリダイレクト
      if (data.requiresPayment && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      // 無料イベントの場合は登録完了
      setIsRegistered(true)
    } catch (err) {
      console.error('Error registering:', err)
      setFormError('登録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年M月d日(E)', { locale: ja })
    } catch {
      return dateString
    }
  }

  const formatDeadline = (schedule: Schedule, applicationDeadlineDays: number) => {
    try {
      const deadline = new Date(schedule.date)
      deadline.setDate(deadline.getDate() - applicationDeadlineDays)
      return format(deadline, 'M月d日(E) HH:mm', { locale: ja })
    } catch {
      return ''
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center text-slate-500">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
          読み込み中...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div role="alert" className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-slate-600">イベントが見つかりません</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 登録完了画面
  if (isRegistered) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-xl font-bold text-green-800 mb-2">登録完了</h2>
              <p className="text-green-700 mb-4">
                イベントへの登録が完了しました。
              </p>
              <div className="bg-white rounded-lg p-4 text-left">
                <h3 className="font-semibold text-slate-900">{event.title}</h3>
                <p className="text-sm text-slate-600 mt-2">
                  {formatDate(displayDate)} {displayTime && `${displayTime}`}
                </p>
                {displayLocation && (
                  <p className="text-sm text-slate-600">{displayLocation}</p>
                )}
              </div>
              <p className="text-sm text-green-600 mt-4">
                確認メールをお送りしました。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* キャンセル通知 */}
        {canceled && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-4">
              <p className="text-yellow-700 text-sm">
                決済がキャンセルされました。再度お申し込みください。
              </p>
            </CardContent>
          </Card>
        )}

        {/* イベント情報 */}
        <Card className="overflow-hidden">
          {event.thumbnailUrl && (
            <div className="w-full overflow-hidden rounded-t-lg">
              <img
                src={event.thumbnailUrl}
                alt={event.title}
                className="w-full h-auto object-contain"
              />
            </div>
          )}
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {event.isPaid && (
                <Badge className="bg-amber-500">
                  ¥{event.price?.toLocaleString()}
                </Badge>
              )}
              {!event.isPaid && (
                <Badge variant="secondary">無料</Badge>
              )}
              {event.schedules.length > 1 && (
                <Badge variant="outline">{event.schedules.length}日程</Badge>
              )}
            </div>
            <CardTitle className="text-xl sm:text-2xl break-words">{event.title}</CardTitle>
            {event.description && (
              <CardDescription className="whitespace-pre-wrap mt-2">
                {event.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {/* 日程が1つの場合：従来の表示 */}
            {event.schedules.length <= 1 && (
              <div className="space-y-3">
                <div className="flex items-center text-slate-600">
                  <Calendar className="h-5 w-5 mr-3 text-slate-400" aria-hidden="true" />
                  <span>{formatDate(displayDate)}</span>
                </div>
                {displayTime && (
                  <div className="flex items-center text-slate-600">
                    <Clock className="h-5 w-5 mr-3 text-slate-400" aria-hidden="true" />
                    <span>{displayTime}</span>
                  </div>
                )}
                {displayLocation && (
                  <div className="flex items-center text-slate-600">
                    <MapPin className="h-5 w-5 mr-3 text-slate-400" aria-hidden="true" />
                    <span>{displayLocation}</span>
                  </div>
                )}
                {event.applicationDeadlineDays !== null && event.schedules[0] && (
                  <div className="text-sm text-orange-600 mt-2">
                    申込期限: {formatDeadline(event.schedules[0], event.applicationDeadlineDays)}
                  </div>
                )}
              </div>
            )}

            {/* 日程が複数の場合：日程選択UI */}
            {event.schedules.length > 1 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">参加日程を選択してください</h3>
                <div className="space-y-2">
                  {event.schedules.map((schedule) => {
                    const selectable = isScheduleSelectable(schedule)
                    const isSelected = selectedScheduleId === schedule.id
                    const deadlinePassed = isScheduleDeadlinePassed(schedule, event.applicationDeadlineDays)
                    return (
                      <label
                        key={schedule.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-[border-color,box-shadow] ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50'
                            : selectable
                            ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            : 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <input
                          type="radio"
                          name="schedule"
                          value={schedule.id}
                          checked={isSelected}
                          disabled={!selectable}
                          onChange={() => setSelectedScheduleId(schedule.id)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 mr-3 flex-shrink-0 flex items-center justify-center ${
                          isSelected ? 'border-emerald-500' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900">
                              {formatDate(schedule.date)}
                            </span>
                            {schedule.time && (
                              <span className="text-slate-600">{schedule.time}</span>
                            )}
                            {schedule.status !== 'OPEN' && (
                              <Badge variant="outline" className="text-xs bg-slate-200 text-slate-600">
                                募集終了
                              </Badge>
                            )}
                            {schedule.status === 'OPEN' && deadlinePassed && (
                              <Badge variant="outline" className="text-xs bg-slate-200 text-slate-600">
                                申込期限切れ
                              </Badge>
                            )}
                          </div>
                          {schedule.location && (
                            <div className="text-sm text-slate-500 mt-0.5">
                              {schedule.location}
                            </div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 申し込みフォーム */}
        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle>参加申し込み</CardTitle>
            <CardDescription>
              以下の情報を入力してお申し込みください
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="山田 太郎"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="example@email.com"
                  disabled={isSubmitting}
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  電話番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="090-1234-5678"
                  disabled={isSubmitting}
                />
              </div>

              {/* カスタムフィールド: externalFormFieldsがある場合は動的レンダリング、nullの場合は従来の紹介者フィールド */}
              {event.externalFormFields ? (
                event.externalFormFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.description && (
                      <p className="text-xs text-slate-500 mb-1">{field.description}</p>
                    )}

                    {field.type === 'TEXT' && (
                      <input
                        type="text"
                        value={customAnswers[field.id] || ''}
                        onChange={(e) => setCustomAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder={field.placeholder || ''}
                        disabled={isSubmitting}
                      />
                    )}

                    {field.type === 'TEXTAREA' && (
                      <textarea
                        value={customAnswers[field.id] || ''}
                        onChange={(e) => setCustomAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        rows={3}
                        placeholder={field.placeholder || ''}
                        disabled={isSubmitting}
                      />
                    )}

                    {field.type === 'SELECT' && (
                      <select
                        value={customAnswers[field.id] || ''}
                        onChange={(e) => setCustomAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        disabled={isSubmitting}
                      >
                        <option value="">選択してください</option>
                        {(field.options || []).map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {field.type === 'MULTI_SELECT' && (
                      <div className="space-y-2">
                        {(field.options || []).map((opt, i) => (
                          <label key={i} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(customAnswers[field.id] || []).includes(opt)}
                              onChange={(e) => {
                                const current = customAnswers[field.id] || []
                                const updated = e.target.checked
                                  ? [...current, opt]
                                  : current.filter((v: string) => v !== opt)
                                setCustomAnswers(prev => ({ ...prev, [field.id]: updated }))
                              }}
                              className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 rounded focus:ring-slate-500 focus:ring-2"
                              disabled={isSubmitting}
                            />
                            <span className="ml-2 text-sm text-slate-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {field.type === 'RADIO' && (
                      <div className="space-y-2">
                        {(field.options || []).map((opt, i) => (
                          <label key={i} className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={`custom-field-${field.id}`}
                              checked={customAnswers[field.id] === opt}
                              onChange={() => setCustomAnswers(prev => ({ ...prev, [field.id]: opt }))}
                              className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 focus:ring-slate-500 focus:ring-2"
                              disabled={isSubmitting}
                            />
                            <span className="ml-2 text-sm text-slate-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {field.type === 'DATE' && (
                      <input
                        type="date"
                        value={customAnswers[field.id] || ''}
                        onChange={(e) => setCustomAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        disabled={isSubmitting}
                      />
                    )}

                    {field.type === 'RATING' && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => setCustomAnswers(prev => ({ ...prev, [field.id]: rating }))}
                            className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                              customAnswers[field.id] === rating
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                            disabled={isSubmitting}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    紹介者
                  </label>
                  <input
                    type="text"
                    value={referrer}
                    onChange={(e) => setReferrer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="紹介者のお名前（任意）"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    処理中...
                  </span>
                ) : event.isPaid ? (
                  `¥${event.price?.toLocaleString()} で申し込む`
                ) : (
                  '申し込む'
                )}
              </Button>

              {event.isPaid && (
                <p className="text-xs text-slate-500 text-center">
                  申し込み後、決済画面に移動します
                </p>
              )}
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
