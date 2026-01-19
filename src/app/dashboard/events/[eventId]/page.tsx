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
  Copy,
  Link,
} from 'lucide-react'
import { AttendanceCodeInput } from '@/components/events/attendance-code-input'
import { VideoSurveyAttendance } from '@/components/events/video-survey-attendance'
import { MtgExemptionForm } from '@/components/events/mtg-exemption-form'
import { InternalSurvey } from '@/components/events/internal-survey'

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
  hasInternalSurvey: boolean  // 内部アンケートが設定されているか
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
  // 外部参加者設定
  allowExternalParticipation: boolean
  externalRegistrationToken: string | null
}

function EventDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const eventId = params.eventId as string

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // 有料イベントの決済処理
  const handleCheckout = async (eventId: string) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/events/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId }),
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

  // イベント登録のキャンセル
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

      // イベント情報を再読み込み
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

    // 有料イベントの場合、決済処理へ
    if (event.isPaid && !event.isRegistered) {
      await handleCheckout(event.id)
      return
    }

    // 有料イベントでPENDING状態の場合も決済処理へ
    if (event.isPaid && event.paymentStatus === 'PENDING') {
      await handleCheckout(event.id)
      return
    }

    // 無料イベントまたはキャンセルの場合
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
          action,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '処理に失敗しました')
      }

      // イベント情報を再読み込み
      window.location.reload()
    } catch (err) {
      console.error('Failed to update registration:', err)
      alert(err instanceof Error ? err.message : '処理に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 全体MTG参加意思の登録
  const handleParticipationIntent = async (intent: 'WILL_ATTEND' | 'WILL_NOT_ATTEND') => {
    if (!user?.id || !event) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/events/participation-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId: event.id,
          intent,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '登録に失敗しました')
      }

      // イベント情報を再読み込み
      window.location.reload()
    } catch (err) {
      console.error('Failed to set participation intent:', err)
      alert(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="イベント詳細" />
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

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="イベント詳細" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4">
                <p className="text-sm text-red-600">{error || 'イベントが見つかりません'}</p>
              </CardContent>
            </Card>
            <Button variant="outline" onClick={() => router.push('/dashboard/events')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              イベント一覧に戻る
            </Button>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <PageHeader title="イベント詳細" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* 戻るボタン */}
            <Button variant="outline" onClick={() => router.push('/dashboard/events')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              イベント一覧に戻る
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
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
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
                <CardTitle className="text-3xl">{event.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* イベント説明 */}
                <div className="prose max-w-none">
                  <p className="text-slate-700 whitespace-pre-wrap">{event.description}</p>
                </div>

                {/* 開催情報 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-center text-slate-600">
                    <Calendar className="h-5 w-5 mr-3 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-500">開催日</div>
                      <div className="font-medium">{formatDate(event.date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-slate-600">
                    <Clock className="h-5 w-5 mr-3 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-500">時間</div>
                      <div className="font-medium">{event.time || '時間未定'}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-slate-600">
                    {event.venueType === 'online' ? (
                      <Video className="h-5 w-5 mr-3 text-slate-400" />
                    ) : (
                      <MapPin className="h-5 w-5 mr-3 text-slate-400" />
                    )}
                    <div>
                      <div className="text-sm text-slate-500">場所</div>
                      <div className="font-medium">{event.location}</div>
                    </div>
                  </div>
                  {/* オンライン参加URL */}
                  {event.onlineMeetingUrl && (
                    <div className="flex items-center text-slate-600 md:col-span-2">
                      <ExternalLink className="h-5 w-5 mr-3 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-500">オンライン参加URL</div>
                        <a
                          href={event.onlineMeetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-700 hover:underline break-all"
                        >
                          {event.onlineMeetingUrl}
                        </a>
                      </div>
                    </div>
                  )}
                  {/* 外部参加者向け申込URL */}
                  {event.allowExternalParticipation && event.externalRegistrationToken && (
                    <div className="flex items-start text-slate-600 md:col-span-2">
                      <Link className="h-5 w-5 mr-3 mt-0.5 text-slate-400" />
                      <div className="flex-1">
                        <div className="text-sm text-slate-500">外部参加者向け申込URL</div>
                        <div className="flex items-center gap-2 mt-1">
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
                            <Copy className="h-4 w-4 mr-1" />
                            コピー
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* 全体MTGの場合は参加者数を非表示 */}
                  {!event.isRecurring && (
                    <div className="flex items-center text-slate-600">
                      <Users className="h-5 w-5 mr-3 text-slate-400" />
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

                {/* 参加登録ボタン */}
                <div className="pt-4 border-t">
                  {/* 全体MTGの場合は専用の参加/不参加選択 */}
                  {event.isRecurring ? (
                    <div className="space-y-4">
                      {/* 出席完了済みの場合 */}
                      {event.attendanceCompletedAt ? (
                        <div className="w-full text-center py-4 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-green-600 font-medium text-lg">
                            ✓ {event.attendanceMethod === 'CODE' ? '出席完了' : '動画視聴+アンケート完了'}
                          </p>
                          {event.attendanceMethod === 'CODE' && (
                            <p className="text-sm text-green-700 mt-1">参加コードで確認済み</p>
                          )}
                        </div>
                      ) : event.exemption?.status === 'APPROVED' ? (
                        /* 免除承認済みの場合 */
                        <div className="w-full text-center py-4 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-purple-600 font-medium text-lg">
                            免除承認済み
                          </p>
                          <p className="text-sm text-purple-700 mt-1">今回の全体MTGは参加免除されています</p>
                        </div>
                      ) : event.participationIntent === 'UNDECIDED' ? (
                        /* 参加意思未回答の場合 - 3択から選択させる */
                        (() => {
                          const isApplicationExpired = event.applicationDeadline ? new Date(event.applicationDeadline) < new Date() : false
                          return (
                            <div className="space-y-4">
                              {isApplicationExpired ? (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                                  <p className="text-red-700 font-medium">参加申込の期限が過ぎました</p>
                                  <p className="text-sm text-red-600 mt-1">
                                    期限: {format(new Date(event.applicationDeadline!), 'M月d日(E) HH:mm', { locale: ja })}
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm font-medium text-slate-700 text-center">
                                    全体MTGへの参加方法を選択してください
                                  </p>
                                  {event.applicationDeadline && (
                                    <p className="text-xs text-center text-orange-600">
                                      申込期限: {format(new Date(event.applicationDeadline), 'M月d日(E) HH:mm', { locale: ja })}
                                    </p>
                                  )}
                                </>
                              )}
                              <div className="grid grid-cols-1 gap-3">
                                {/* 参加する */}
                                <Button
                                  size="lg"
                                  className="h-auto py-4 bg-green-600 hover:bg-green-700 flex flex-col items-center w-full disabled:opacity-50"
                                  onClick={() => handleParticipationIntent('WILL_ATTEND')}
                                  disabled={isSubmitting || isApplicationExpired}
                                >
                                  <span className="font-bold text-lg">① 参加する</span>
                                  <span className="text-xs opacity-90 mt-1">当日参加コードを入力して出席</span>
                                </Button>
                                {/* 欠席申請 */}
                                <Button
                                  size="lg"
                                  variant="outline"
                                  className="h-auto py-4 px-3 border-2 border-purple-300 text-purple-700 hover:bg-purple-50 flex flex-col items-center w-full disabled:opacity-50"
                                  onClick={() => {
                                    document.getElementById('exemption-section')?.scrollIntoView({ behavior: 'smooth' })
                                  }}
                                  disabled={isSubmitting || isApplicationExpired}
                                >
                                  <span className="font-bold text-lg">② 欠席申請をする</span>
                                  <span className="text-xs opacity-70 mt-1 text-center whitespace-normal leading-tight">やむを得ない事情がある場合<br className="sm:hidden" />（動画視聴+アンケートで出席扱い）</span>
                                </Button>
                              </div>
                            </div>
                          )
                        })()
                      ) : event.participationIntent === 'WILL_ATTEND' ? (
                        /* 参加予定の場合 */
                        <div className="space-y-4">
                          <div className="w-full text-center py-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-green-700 font-medium">✓ 「参加する」を選択済み</p>
                            <p className="text-xs text-green-600 mt-1">当日、参加コードを入力して正式参加となります</p>
                          </div>
                          {event.status === 'upcoming' && event.hasAttendanceCode && (
                            <Button
                              size="lg"
                              className="w-full bg-green-600 hover:bg-green-700"
                              onClick={() => document.getElementById('attendance-section')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                              参加コードを入力する
                            </Button>
                          )}
                          {event.status === 'completed' && (event.vimeoUrl || event.surveyUrl) && (
                            <Button
                              size="lg"
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              onClick={() => document.getElementById('attendance-section')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                              録画視聴+アンケートで出席する
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-purple-600"
                            onClick={() => document.getElementById('exemption-section')?.scrollIntoView({ behavior: 'smooth' })}
                          >
                            欠席申請をする
                          </Button>
                        </div>
                      ) : (
                        /* 欠席申請済み（WILL_NOT_ATTEND）の場合 - 動画視聴で出席扱い */
                        <div className="space-y-4">
                          <div className="w-full text-center py-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-purple-700 font-medium">✓ 欠席申請済み（動画視聴で出席）</p>
                            <p className="text-xs text-purple-600 mt-1">動画視聴+アンケート回答で出席扱いになります</p>
                            {event.attendanceDeadline && (
                              <p className="text-xs text-purple-500 mt-1">提出期限: {formatDate(event.attendanceDeadline)}</p>
                            )}
                          </div>
                          {(event.vimeoUrl || event.surveyUrl) && (
                            <Button
                              size="lg"
                              className="w-full bg-purple-600 hover:bg-purple-700"
                              onClick={() => document.getElementById('attendance-section')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                              動画視聴+アンケート回答へ
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600"
                            onClick={() => handleParticipationIntent('WILL_ATTEND')}
                            disabled={isSubmitting}
                          >
                            参加に変更する
                          </Button>
                        </div>
                      )}
                      {event.exemption?.status === 'PENDING' && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                          <p className="text-sm text-green-800">✓ 欠席申請が承認されました</p>
                        </div>
                      )}
                    </div>
                  ) : event.isPaid && event.paymentStatus === 'PENDING' ? (
                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        variant="default"
                        className="flex-1"
                        disabled={isSubmitting}
                        onClick={() => handleCheckout(event.id)}
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
              <Card id="attendance-section">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>出席確認</CardTitle>
                    {/* 期限表示 */}
                    {event.attendanceDeadline && (
                      <div className={`text-sm px-3 py-1 rounded-full ${
                        new Date(event.attendanceDeadline) < new Date()
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        <Clock className="inline h-3.5 w-3.5 mr-1" />
                        期限: {format(new Date(event.attendanceDeadline), 'M月d日(E) HH:mm', { locale: ja })}
                        {new Date(event.attendanceDeadline) < new Date() && ' (期限切れ)'}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 欠席申請中・承認済みの場合のメッセージ */}
                  {event.isRecurring && event.exemption?.status === 'APPROVED' ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm text-purple-700">欠席申請が承認されています。出席確認は不要です。</p>
                    </div>
                  ) : (
                    <>
                      {/* 参加コード入力（イベント開催中 or 完了後）- 動画URLが設定されていない場合のみ */}
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

                      {/* 録画視聴+アンケート（動画またはアンケートが設定されていれば表示） */}
                      {(event.vimeoUrl || event.surveyUrl || event.hasInternalSurvey) && (
                        <>
                          {event.attendanceDeadline && new Date(event.attendanceDeadline) < new Date() ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                              <p className="text-sm text-slate-600">動画視聴・アンケート提出の期限が過ぎました</p>
                            </div>
                          ) : (
                            <>
                              {/* 外部アンケートURL（従来方式）の場合 */}
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
                              {/* 内部アンケート（新方式）の場合 */}
                              {event.hasInternalSurvey && (
                                <div className="space-y-4">
                                  {/* 動画視聴コンポーネント（内部アンケートの場合、VideoSurveyAttendanceから動画部分のみ使用） */}
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
                                  {/* 内部アンケートコンポーネント */}
                                  <InternalSurvey
                                    eventId={event.id}
                                    videoWatched={event.videoWatched}
                                    onSurveyComplete={() => window.location.reload()}
                                  />
                                </div>
                              )}
                              {/* 動画のみ（アンケートなし）の場合 */}
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

                      {/* 動画もアンケートもまだ設定されていない場合 */}
                      {!event.vimeoUrl && !event.surveyUrl && !event.hasAttendanceCode && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <p className="text-sm text-slate-600">
                            出席確認の準備中です。動画・アンケートが設定されるまでお待ちください。
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 出席完了表示 */}
            {event.isRegistered && event.attendanceCompletedAt && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-6">
                  <div className="flex items-center gap-3 text-green-800">
                    <CheckCircle2 className="h-6 w-6" />
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

            {/* 全体MTG欠席申請セクション */}
            {event.isRecurring && user && !event.attendanceCompletedAt && (
              <Card id="exemption-section">
                <CardHeader>
                  <CardTitle>全体MTG欠席申請</CardTitle>
                </CardHeader>
                <CardContent>
                  {event.exemption?.status === 'APPROVED' ? (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-800">欠席申請が承認されました</p>
                        <p className="text-sm text-green-700">今月の全体MTGへの参加は免除されています</p>
                        {event.exemption.adminNotes && (
                          <p className="text-xs text-slate-600 mt-1">管理者コメント: {event.exemption.adminNotes}</p>
                        )}
                      </div>
                    </div>
                  ) : event.exemption?.status === 'REJECTED' ? (
                    <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex-1">
                        <p className="font-semibold text-red-800">欠席申請が却下されました</p>
                        <p className="text-sm text-red-700">参加コード入力または録画視聴+アンケートで出席確認を行ってください</p>
                        {event.exemption.adminNotes && (
                          <p className="text-xs text-slate-600 mt-1">却下理由: {event.exemption.adminNotes}</p>
                        )}
                      </div>
                    </div>
                  ) : event.exemption?.status === 'PENDING' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex-1">
                          <p className="font-semibold text-yellow-800">欠席申請を受け付けました</p>
                          <p className="text-sm text-yellow-700">全体MTG終了後に、動画およびアンケートをアップロードいたしますので、ご視聴のうえご回答をお願いいたします。</p>
                        </div>
                      </div>
                    </div>
                  ) : event.applicationDeadline && new Date(event.applicationDeadline) < new Date() ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 font-medium">参加申込の期限が過ぎたため、欠席申請はできません</p>
                      <p className="text-sm text-red-600 mt-1">
                        期限: {format(new Date(event.applicationDeadline), 'M月d日(E) HH:mm', { locale: ja })}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">
                        やむを得ない事情（冠婚葬祭、急な家族の事情など）で参加できない場合は、事前に欠席申請を行ってください。
                      </p>
                      <MtgExemptionForm
                        eventId={event.id}
                        eventTitle={event.title}
                        userName={user.name || ''}
                        memberId={user.memberId || ''}
                        onSuccess={() => window.location.reload()}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 過去イベント記録（完了イベントのみ） */}
            {event.status === 'completed' && (event.summary || event.photos.length > 0 || event.materialsUrl) && (
              <Card>
                <CardHeader>
                  <CardTitle>イベント記録</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* サマリー */}
                  {event.summary && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">開催報告</h3>
                      <p className="text-slate-700 whitespace-pre-wrap">{event.summary}</p>
                    </div>
                  )}

                  {/* 実施情報 */}
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

                  {/* 写真 */}
                  {event.photos.length > 0 && (
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
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

                  {/* 資料 */}
                  {event.materialsUrl && (
                    <div className="pt-4 border-t">
                      <a
                        href={event.materialsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <FileText className="h-5 w-5" />
                        イベント資料をダウンロード
                        <Download className="h-4 w-4" />
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

export default function EventDetailPage() {
  return (
    <ProtectedRoute>
      <EventDetailPageContent />
    </ProtectedRoute>
  )
}
