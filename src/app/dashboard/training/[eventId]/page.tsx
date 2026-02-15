'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Loader2,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  Link,
  Copy,
} from 'lucide-react'
import { AttendanceCodeInput } from '@/components/events/attendance-code-input'
import { VideoSurveyAttendance } from '@/components/events/video-survey-attendance'
import { MtgExemptionForm } from '@/components/events/mtg-exemption-form'
import { InternalSurvey } from '@/components/events/internal-survey'

type Schedule = {
  id: string
  date: string
  time: string
  location: string
  onlineMeetingUrl: string | null
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
  registrationCount: number
}

type EventDetail = {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: 'required' | 'optional' | 'manager-only'
  targetRoles: ('member' | 'fp' | 'manager' | 'all')[]
  attendanceType: 'required' | 'optional'
  venueType: 'online' | 'offline' | 'hybrid'
  location: string
  maxParticipants: number | null
  currentParticipants: number
  isRegistered: boolean
  status: 'upcoming' | 'completed' | 'cancelled'
  thumbnailUrl: string | null
  isPaid: boolean
  price: number | null
  paymentStatus: string | null
  // オンライン参加URL
  onlineMeetingUrl: string | null
  // 出席確認関連
  hasAttendanceCode: boolean
  applicationDeadline: string | null
  attendanceDeadline: string | null
  vimeoUrl: string | null
  surveyUrl: string | null
  hasInternalSurvey: boolean
  attendanceMethod: 'CODE' | 'VIDEO_SURVEY' | null
  attendanceCompletedAt: string | null
  videoWatched: boolean
  surveyCompleted: boolean
  // 過去イベント記録用
  summary: string | null
  photos: string[]
  materialsUrl: string | null
  actualParticipants: number | null
  actualLocation: string | null
  // 定期開催（全体MTG）判定用
  isRecurring: boolean
  // 参加意思（全体MTG用）
  participationIntent: 'UNDECIDED' | 'WILL_ATTEND' | 'WILL_NOT_ATTEND'
  participationIntentAt: string | null
  // 欠席申請情報
  exemption: {
    id: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    reason: string
    adminNotes: string | null
    reviewedAt: string | null
    createdAt: string
  } | null
  // 外部参加者向け
  allowExternalParticipation: boolean
  externalRegistrationToken: string | null
  // スケジュール関連
  schedules: Schedule[]
  registeredScheduleId: string | null
}

function TrainingEventDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const eventId = params.eventId as string

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvent = async () => {
      if (!user?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/events/${eventId}`, {
          credentials: 'include',
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'イベント情報の取得に失敗しました')
        }

        setEvent(data.event)

        // 日程選択の初期化：登録済みスケジュールがあればそれを、なければ最初のOPENスケジュールを選択
        const eventData = data.event as EventDetail
        if (eventData.registeredScheduleId) {
          setSelectedScheduleId(eventData.registeredScheduleId)
        } else if (eventData.schedules && eventData.schedules.length > 0) {
          const firstOpenSchedule = eventData.schedules.find(s => s.status === 'OPEN')
          setSelectedScheduleId(firstOpenSchedule?.id ?? eventData.schedules[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch event:', err)
        setError(err instanceof Error ? err.message : 'イベント情報の取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [eventId, user?.id])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年M月d日(E)', { locale: ja })
    } catch {
      return dateString
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'required':
        return 'destructive'
      case 'optional':
        return 'secondary'
      case 'manager-only':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'required':
        return '必須'
      case 'optional':
        return '任意'
      case 'manager-only':
        return 'Mgr限定'
      default:
        return type
    }
  }

  const canRegisterForEvent = (event: EventDetail) => {
    if (event.type === 'manager-only' && user?.role !== 'manager' && user?.role !== 'admin') {
      return false
    }
    // 0またはnullは制限なしとして扱う
    if (event.maxParticipants !== null && event.maxParticipants !== undefined && event.maxParticipants > 0) {
      return event.currentParticipants < event.maxParticipants
    }
    return true
  }

  const handleCheckout = async (eventId: string, scheduleId?: string | null) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/events/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId, scheduleId: scheduleId ?? null }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'チェックアウトの作成に失敗しました')
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err)
      alert(err instanceof Error ? err.message : 'チェックアウトの作成に失敗しました')
      setIsSubmitting(false)
    }
  }

  const handleCancelRegistration = async (eventId: string) => {
    if (!confirm('申し込みをキャンセルしますか？')) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/events/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'キャンセルに失敗しました')
      }

      window.location.reload()
    } catch (err) {
      console.error('Failed to cancel registration:', err)
      alert(err instanceof Error ? err.message : 'キャンセルに失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleRegistration = async (event: EventDetail) => {
    if (!user?.id) return

    if (event.isPaid && !event.isRegistered) {
      await handleCheckout(event.id, selectedScheduleId)
      return
    }

    if (event.isPaid && event.paymentStatus === 'PENDING') {
      await handleCheckout(event.id, selectedScheduleId)
      return
    }

    const action = event.isRegistered ? 'unregister' : 'register'

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          eventId: event.id,
          scheduleId: selectedScheduleId, // 選択された日程ID
          action,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '処理に失敗しました')
      }

      window.location.reload()
    } catch (err) {
      console.error('Failed to update registration:', err)
      alert(err instanceof Error ? err.message : '処理に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64 min-w-0">
          <PageHeader title="イベント詳細" />
          <main className="px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
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

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64 min-w-0">
          <PageHeader title="イベント詳細" />
          <main className="px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4">
                <p role="alert" className="text-sm text-red-600">{error || 'イベントが見つかりません'}</p>
              </CardContent>
            </Card>
            <Button variant="outline" onClick={() => router.push('/dashboard/training')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              イベント・研修一覧に戻る
            </Button>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64 min-w-0">
        <PageHeader title="イベント詳細" />

        <main className="px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* 戻るボタン */}
            <Button variant="outline" onClick={() => router.push('/dashboard/training')}>
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              イベント・研修一覧に戻る
            </Button>

            {/* サムネイル画像 */}
            {event.thumbnailUrl && (
              <a
                href={event.thumbnailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-lg overflow-hidden shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                <img
                  src={event.thumbnailUrl}
                  alt={event.title}
                  className="w-full h-auto object-contain"
                />
              </a>
            )}

            {/* イベント情報 */}
            <Card className="overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={getEventTypeColor(event.type)}>
                    {getEventTypeLabel(event.type)}
                  </Badge>
                  {event.isPaid && (
                    <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700">
                      ¥{event.price?.toLocaleString()}
                    </Badge>
                  )}
                  {event.isRegistered && event.paymentStatus === 'PAID' && (
                    <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                      支払い済み
                    </Badge>
                  )}
                  {event.isRegistered && event.paymentStatus === 'PENDING' && (
                    <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                      支払い待ち
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl sm:text-3xl break-words">{event.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                {/* イベント説明 */}
                <div className="prose max-w-none">
                  <p className="text-slate-700 whitespace-pre-wrap">{event.description}</p>
                </div>

                {/* 開催情報 */}
                {(() => {
                  // 申し込み済みで複数日程がある場合は、登録済みスケジュールの情報を表示
                  const registeredSchedule = event.isRegistered && event.registeredScheduleId && event.schedules.length > 1
                    ? event.schedules.find(s => s.id === event.registeredScheduleId)
                    : null

                  const displayDate = registeredSchedule?.date || event.date
                  const displayTime = registeredSchedule?.time || event.time
                  const displayLocation = registeredSchedule?.location || event.location
                  const displayUrl = registeredSchedule?.onlineMeetingUrl || event.onlineMeetingUrl

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      {registeredSchedule && (
                        <div className="md:col-span-2 mb-2">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            あなたの参加予定日程
                          </div>
                        </div>
                      )}
                      <div className="flex items-center text-slate-600">
                        <Calendar className="h-5 w-5 mr-3 text-slate-400" aria-hidden="true" />
                        <div>
                          <div className="text-sm text-slate-500">開催日</div>
                          <div className="font-medium">{formatDate(displayDate)}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Clock className="h-5 w-5 mr-3 text-slate-400" aria-hidden="true" />
                        <div>
                          <div className="text-sm text-slate-500">時間</div>
                          <div className="font-medium">{displayTime || '時間未定'}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-600">
                        {event.venueType === 'online' ? (
                          <Video className="h-5 w-5 mr-3 text-slate-400" aria-hidden="true" />
                        ) : (
                          <MapPin className="h-5 w-5 mr-3 text-slate-400" aria-hidden="true" />
                        )}
                        <div>
                          <div className="text-sm text-slate-500">場所</div>
                          <div className="font-medium">{displayLocation}</div>
                        </div>
                      </div>
                      {/* オンライン参加URL（申込済みの場合のみ表示） */}
                      {displayUrl && event.isRegistered && (
                        <div className="flex items-center text-slate-600 md:col-span-2 min-w-0">
                          <ExternalLink className="h-5 w-5 mr-3 text-slate-400 shrink-0" aria-hidden="true" />
                          <div className="min-w-0">
                            <div className="text-sm text-slate-500">オンライン参加URL</div>
                            <a
                              href={displayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:text-blue-700 hover:underline break-all"
                            >
                              {displayUrl}
                            </a>
                          </div>
                        </div>
                      )}
                      {!event.isRecurring && (
                        <div className="flex items-center text-slate-600">
                          <Users className="h-5 w-5 mr-3 text-slate-400" aria-hidden="true" />
                          <div>
                            <div className="text-sm text-slate-500">参加者</div>
                            <div className="font-medium">
                              {event.currentParticipants}
                              {event.maxParticipants && `/${event.maxParticipants}`}名
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* 日程選択（複数日程がある場合） */}
                {event.schedules.length > 1 && !event.isRegistered && (
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-slate-900 mb-3">参加日程を選択してください</h3>
                    <div className="space-y-2">
                      {event.schedules.map((schedule) => {
                        const isOpen = schedule.status === 'OPEN'
                        const isSelected = selectedScheduleId === schedule.id
                        return (
                          <label
                            key={schedule.id}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-[border-color,box-shadow] ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50'
                                : isOpen
                                ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                : 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <input
                              type="radio"
                              name="schedule"
                              value={schedule.id}
                              checked={isSelected}
                              disabled={!isOpen}
                              onChange={() => setSelectedScheduleId(schedule.id)}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                              isSelected ? 'border-emerald-500' : 'border-slate-300'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">
                                  {formatDate(schedule.date)}
                                </span>
                                <span className="text-slate-600">{schedule.time}</span>
                                {!isOpen && (
                                  <Badge variant="outline" className="text-xs bg-slate-200 text-slate-600">
                                    募集終了
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


                {/* 外部参加者向け申込URL */}
                {event.allowExternalParticipation && event.externalRegistrationToken && (
                  <div className="flex items-start text-slate-600 md:col-span-2 min-w-0">
                    <Link className="h-5 w-5 mr-3 mt-0.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-500">外部参加者向け申込URL</div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                        <input
                          type="text"
                          readOnly
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event.externalRegistrationToken}/register`}
                          className="flex-1 text-sm px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 min-w-0"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => {
                            const url = `${window.location.origin}/events/${event.externalRegistrationToken}/register`
                            navigator.clipboard.writeText(url)
                            alert('URLをコピーしました')
                          }}
                        >
                          <Copy className="h-4 w-4 mr-1" aria-hidden="true" />
                          コピー
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 参加登録ボタン */}
                <div className="pt-4 border-t">
                  {event.isPaid && event.paymentStatus === 'PENDING' ? (
                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        variant="default"
                        className="flex-1"
                        disabled={isSubmitting}
                        onClick={() => handleCheckout(event.id, selectedScheduleId)}
                      >
                        支払いを完了する
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => handleCancelRegistration(event.id)}
                      >
                        キャンセル
                      </Button>
                    </div>
                  ) : event.isPaid && event.paymentStatus === 'PAID' ? (
                    <div className="w-full text-center py-4 bg-green-50 rounded-lg">
                      <p className="text-green-600 font-medium text-lg">
                        ✓ 参加確定（お支払い完了）
                      </p>
                    </div>
                  ) : canRegisterForEvent(event) ? (
                    <Button
                      size="lg"
                      variant={event.isRegistered ? 'outline' : 'default'}
                      className="w-full"
                      disabled={isSubmitting}
                      onClick={() => handleToggleRegistration(event)}
                    >
                      {event.isRegistered
                        ? 'キャンセル'
                        : event.isPaid
                        ? `¥${event.price?.toLocaleString()}で申し込む`
                        : '申し込む'}
                    </Button>
                  ) : (
                    <Button size="lg" disabled className="w-full">
                      参加不可
                    </Button>
                  )}

                  {event.type === 'manager-only' &&
                    user?.role !== 'manager' &&
                    user?.role !== 'admin' && (
                      <div className="mt-3 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg text-center">
                        マネージャー限定イベントです
                      </div>
                    )}

                  {!event.isRecurring && event.maxParticipants !== null && event.maxParticipants > 0 && event.currentParticipants >= event.maxParticipants && (
                    <div className="mt-3 text-sm text-slate-500 text-center">
                      定員に達しました
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 出席確認セクション */}
            {event.isRegistered && !event.attendanceCompletedAt && (
              <Card id="attendance-section" className="overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle>出席確認</CardTitle>
                    {event.attendanceDeadline && (
                      <div className={`text-xs sm:text-sm px-3 py-1 rounded-full ${
                        new Date(event.attendanceDeadline) < new Date()
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        <Clock className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
                        期限: {format(new Date(event.attendanceDeadline), 'M月d日(E) HH:mm', { locale: ja })}
                        {new Date(event.attendanceDeadline) < new Date() && ' (期限切れ)'}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                  {event.hasAttendanceCode && !event.vimeoUrl && (
                    <>
                      {event.attendanceDeadline && new Date(event.attendanceDeadline) < new Date() ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <p className="text-sm text-slate-600">参加コード入力の期限が過ぎました</p>
                        </div>
                      ) : (
                        <AttendanceCodeInput
                          eventId={event.id}
                          eventTitle={event.title}
                          onSuccess={() => window.location.reload()}
                        />
                      )}
                    </>
                  )}

                  {(event.vimeoUrl || event.surveyUrl || event.hasInternalSurvey) && (
                    <>
                      {event.attendanceDeadline && new Date(event.attendanceDeadline) < new Date() ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <p className="text-sm text-slate-600">動画視聴・アンケート提出の期限が過ぎました</p>
                        </div>
                      ) : (
                        <>
                          {event.surveyUrl && !event.hasInternalSurvey && (
                            <VideoSurveyAttendance
                              eventId={event.id}
                              eventTitle={event.title}
                              vimeoUrl={event.vimeoUrl}
                              surveyUrl={event.surveyUrl}
                              videoWatched={event.videoWatched}
                              surveyCompleted={event.surveyCompleted}
                              onSuccess={() => window.location.reload()}
                            />
                          )}
                          {event.hasInternalSurvey && (
                            <div className="space-y-4">
                              {event.vimeoUrl && (
                                <VideoSurveyAttendance
                                  eventId={event.id}
                                  eventTitle={event.title}
                                  vimeoUrl={event.vimeoUrl}
                                  surveyUrl={null}
                                  videoWatched={event.videoWatched}
                                  surveyCompleted={event.surveyCompleted}
                                  onSuccess={() => window.location.reload()}
                                />
                              )}
                              <InternalSurvey
                                eventId={event.id}
                                videoWatched={event.videoWatched}
                                onSurveyComplete={() => window.location.reload()}
                              />
                            </div>
                          )}
                          {event.vimeoUrl && !event.surveyUrl && !event.hasInternalSurvey && (
                            <VideoSurveyAttendance
                              eventId={event.id}
                              eventTitle={event.title}
                              vimeoUrl={event.vimeoUrl}
                              surveyUrl={null}
                              videoWatched={event.videoWatched}
                              surveyCompleted={event.surveyCompleted}
                              onSuccess={() => window.location.reload()}
                            />
                          )}
                        </>
                      )}
                    </>
                  )}

                  {!event.vimeoUrl && !event.surveyUrl && !event.hasAttendanceCode && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <p className="text-sm text-slate-600">
                        出席確認の準備中です。動画・アンケートが設定されるまでお待ちください。
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 出席完了表示 */}
            {event.isRegistered && event.attendanceCompletedAt && (
              <Card className="border-green-200 bg-green-50 overflow-hidden">
                <CardContent className="p-4 sm:py-6 sm:px-6">
                  <div className="flex items-center gap-3 text-green-800">
                    <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-lg">
                        {event.attendanceMethod === 'CODE' ? '出席完了' : '動画視聴+アンケート完了'}
                      </p>
                      {event.attendanceMethod === 'CODE' && (
                        <p className="text-sm">参加コードで確認済み</p>
                      )}
                      <p className="text-xs mt-1">{formatDate(event.attendanceCompletedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 過去イベント記録（完了イベントのみ） */}
            {event.status === 'completed' && (event.summary || event.photos.length > 0 || event.materialsUrl) && (
              <Card className="overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>イベント記録</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                  {event.summary && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">開催報告</h3>
                      <p className="text-slate-700 whitespace-pre-wrap">{event.summary}</p>
                    </div>
                  )}

                  {(event.actualParticipants || event.actualLocation) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      {event.actualParticipants && (
                        <div>
                          <div className="text-sm text-slate-500">実参加者数</div>
                          <div className="font-medium text-slate-900">{event.actualParticipants}名</div>
                        </div>
                      )}
                      {event.actualLocation && (
                        <div>
                          <div className="text-sm text-slate-500">実施場所</div>
                          <div className="font-medium text-slate-900">{event.actualLocation}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {event.photos.length > 0 && (
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" aria-hidden="true" />
                        イベント写真
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {event.photos.map((photo, index) => (
                          <a
                            key={index}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={photo}
                              alt={`イベント写真 ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {event.materialsUrl && (
                    <div className="pt-4 border-t">
                      <a
                        href={event.materialsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <FileText className="h-5 w-5" aria-hidden="true" />
                        イベント資料をダウンロード
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function TrainingEventDetailPage() {
  return (
    <ProtectedRoute>
      <TrainingEventDetailPageContent />
    </ProtectedRoute>
  )
}
