'use client'

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Users, Video, Loader2 } from "lucide-react"

function EventsPageContent() {
  const { user } = useAuth()
  const [events, setEvents] = useState<EventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 決済確認処理（Stripeからのリダイレクト後）
  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('session_id')

      if (!sessionId) return

      console.log('[PAYMENT_VERIFY] Session ID found in URL:', sessionId)

      try {
        const response = await fetch('/api/events/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionId })
        })

        const data = await response.json()

        if (data.success) {
          console.log('[PAYMENT_VERIFY] Payment verified:', data)
          setPaymentMessage({
            type: 'success',
            text: '決済が完了しました！イベントへの参加が確定しました。'
          })

          // URLからsession_idを削除（履歴に残さない）
          window.history.replaceState({}, '', '/dashboard/events')

          // イベント一覧を再読み込み
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else {
          console.warn('[PAYMENT_VERIFY] Payment verification failed:', data)
          setPaymentMessage({
            type: 'error',
            text: data.message || '決済の確認に失敗しました'
          })
        }
      } catch (error) {
        console.error('[PAYMENT_VERIFY] Error:', error)
        setPaymentMessage({
          type: 'error',
          text: '決済の確認中にエラーが発生しました'
        })
      }
    }

    verifyPayment()
  }, [])

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user?.id) {
        console.log('No user ID available, skipping fetch')
        return
      }

      console.log('Starting to fetch events, user:', { id: user.id, role: user.role, email: user.email })

      setIsLoading(true)
      setError(null)
      let retryCount = 0
      const maxRetries = 3
      const retryDelay = 1000 // 1秒

      while (retryCount < maxRetries) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 15000) // 15秒タイムアウトに延長

          console.log(`Fetching events for user: ${user.id}`)
          const response = await fetch(`/api/events?userId=${encodeURIComponent(user.id)}`, {
            signal: controller.signal,
            credentials: 'include' // Cookieベースの認証に必要
          })

          clearTimeout(timeoutId)

          console.log(`Events API response status: ${response.status} ${response.statusText}`)
          console.log('Response headers:', Object.fromEntries(response.headers.entries()))

          if (!response.ok) {
            // レスポンステキストを取得
            const responseText = await response.text()
            console.error('Events API error response text:', responseText)

            // JSONとしてパース試行
            let errorData: any = { error: 'Unknown error' }
            try {
              if (responseText) {
                errorData = JSON.parse(responseText)
              }
            } catch (parseError) {
              console.error('Failed to parse error response as JSON:', parseError)
              errorData = { error: responseText || `HTTP ${response.status}: ${response.statusText}` }
            }

            console.error('Events API error response:', errorData)
            throw new Error(errorData.error || `ページの取得に失敗しました (${response.status})`)
          }

          const data = await response.json()

          if (!data.success) {
            throw new Error(data.error || "イベントの取得に失敗しました")
          }

          const formattedEvents: EventItem[] = data.events.map((event: any) => ({
            id: event.id,
            title: event.title,
            description: event.description,
            date: event.date,
            time: event.time,
            type: event.type, // 後方互換性のため残す
            targetRoles: event.targetRoles || [],
            attendanceType: event.attendanceType || 'optional',
            venueType: event.venueType || 'online',
            location: event.location,
            maxParticipants: event.maxParticipants,
            currentParticipants: event.currentParticipants,
            isRegistered: event.isRegistered,
            status: event.status,
            isPaid: event.isPaid || false,
            price: event.price || null,
            paymentStatus: event.paymentStatus || null,
          }))

          setEvents(formattedEvents)
          setIsLoading(false)
          return // 成功したら終了
        } catch (err: any) {
          console.error(`Failed to fetch events (attempt ${retryCount + 1}/${maxRetries}):`, err)
          
          if (err.name === 'AbortError') {
            console.error('Request timeout')
          }

          retryCount++
          
          if (retryCount >= maxRetries) {
            console.error('Failed to fetch events after retries')
            setError(err instanceof Error ? err.message : "イベントの取得に失敗しました")
            setIsLoading(false)
            return
          }

          // リトライ前に待機
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount))
        }
      }
    }

    fetchEvents()
  }, [user?.id])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy年M月d日(E)", { locale: ja })
    } catch {
      return dateString
    }
  }

  const visibleEvents = useMemo(() => {
    return events.filter(event => {
      if (event.type === 'manager-only') {
        return user?.role === 'manager' || user?.role === 'admin'
      }
      return true
    })
  }, [events, user?.role])

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'required': return 'destructive'
      case 'optional': return 'secondary'
      case 'manager-only': return 'default'
      default: return 'secondary'
    }
  }

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'required': return '必須'
      case 'optional': return '任意'
      case 'manager-only': return 'Mgr限定'
      default: return type
    }
  }

  const canRegisterForEvent = (event: any) => {
    if (event.type === 'manager-only' && user?.role !== 'manager' && user?.role !== 'admin') {
      return false
    }
    if (event.maxParticipants !== null && event.maxParticipants !== undefined) {
      return event.currentParticipants < event.maxParticipants
    }
    return true
  }

  // 有料イベントの決済処理（新規申込 or PENDING状態からの再決済）
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

      // Stripe Checkoutページにリダイレクト
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err)
      alert(err instanceof Error ? err.message : 'チェックアウトの作成に失敗しました')
      setIsSubmitting(false)
    }
  }

  // イベント登録のキャンセル（PENDING状態のみ）
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

      // イベント一覧を更新（isRegistered=false, paymentStatus=nullに）
      setEvents(prev =>
        prev.map(item =>
          item.id === eventId
            ? {
                ...item,
                isRegistered: false,
                paymentStatus: null,
                currentParticipants: Math.max(0, item.currentParticipants - 1),
              }
            : item
        )
      )

      alert('申し込みをキャンセルしました')
    } catch (err) {
      console.error('Failed to cancel registration:', err)
      alert(err instanceof Error ? err.message : 'キャンセルに失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleRegistration = async (event: EventItem) => {
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

    // 無料イベントまたはキャンセルの場合は既存ロジック
    const action = event.isRegistered ? 'unregister' : 'register'

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Cookieベースの認証に必要
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

      setEvents(prev =>
        prev.map(item =>
          item.id === event.id
            ? {
                ...item,
                isRegistered: action === 'register',
                currentParticipants: data.currentParticipants ?? item.currentParticipants,
              }
            : item
        )
      )
    } catch (err) {
      console.error('Failed to update registration:', err)
      alert(err instanceof Error ? err.message : '処理に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        <PageHeader title="イベント" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">イベント一覧</h2>
                <p className="text-slate-600">参加予定のイベントと新着イベント</p>
              </div>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {paymentMessage && (
              <Card className={paymentMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <CardContent className="py-4">
                  <p className={`text-sm font-medium ${paymentMessage.type === 'success' ? 'text-green-800' : 'text-red-600'}`}>
                    {paymentMessage.text}
                  </p>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center text-slate-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  読み込み中です
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visibleEvents.map(event => (
                <Card key={event.id} className="hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
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
                      <div className="flex items-center text-sm text-slate-500">
                        <Users className="h-4 w-4 mr-1" />
                        {event.currentParticipants}/{event.maxParticipants}名
                      </div>
                    </div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar className="h-4 w-4 mr-2" />
                          {formatDate(event.date)}
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <Clock className="h-4 w-4 mr-2" />
                          {event.time || '時間未定'}
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        {event.venueType === 'online' ? (
                          <Video className="h-4 w-4 mr-2" />
                        ) : event.venueType === 'offline' ? (
                          <MapPin className="h-4 w-4 mr-2" />
                        ) : (
                          <>
                            <Video className="h-4 w-4 mr-1" />
                            <MapPin className="h-4 w-4 mr-2" />
                          </>
                        )}
                        {event.location}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {/* PENDING状態：支払い完了ボタン＋キャンセルボタン */}
                      {event.isPaid && event.paymentStatus === 'PENDING' ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1"
                            disabled={isSubmitting}
                            onClick={() => handleCheckout(event.id)}
                          >
                            支払いを完了する
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSubmitting}
                            onClick={() => handleCancelRegistration(event.id)}
                          >
                            キャンセル
                          </Button>
                        </>
                      ) : /* PAID状態：参加確定メッセージ */
                      event.isPaid && event.paymentStatus === 'PAID' ? (
                        <div className="w-full text-center py-2 text-sm text-green-600 font-medium">
                          ✓ 参加確定（お支払い完了）
                        </div>
                      ) : /* 未登録 or 無料イベント */
                      canRegisterForEvent(event) ? (
                        <Button
                          size="sm"
                          variant={event.isRegistered ? "outline" : "default"}
                          className="flex-1"
                          disabled={isSubmitting}
                          onClick={() => handleToggleRegistration(event)}
                        >
                          {event.isRegistered
                            ? "キャンセル"
                            : event.isPaid
                              ? `¥${event.price?.toLocaleString()}で申し込む`
                              : "申し込む"
                          }
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled
                          className="flex-1"
                        >
                          参加不可
                        </Button>
                      )}
                    </div>

                    {event.type === 'manager-only' && user?.role !== 'manager' && user?.role !== 'admin' && (
                      <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                        マネージャー限定イベントです
                      </div>
                    )}

                    {event.maxParticipants !== null && event.maxParticipants !== undefined && (
                      <div className="mt-2 text-xs text-slate-500">
                        定員: {event.currentParticipants}/{event.maxParticipants}名
                      </div>
                    )}
                  </CardContent>
                </Card>
                ))}
              </div>
            )}

            {!isLoading && visibleEvents.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">参加可能なイベントがありません</p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function EventsPage() {
  return (
    <ProtectedRoute>
      <EventsPageContent />
    </ProtectedRoute>
  )
}

type EventItem = {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: 'required' | 'optional' | 'manager-only' // 後方互換性のため残す
  targetRoles: ('member' | 'fp' | 'manager' | 'all')[]
  attendanceType: 'required' | 'optional'
  venueType: 'online' | 'offline' | 'hybrid'
  location: string
  maxParticipants: number | null
  currentParticipants: number
  isRegistered: boolean
  status: 'upcoming' | 'completed' | 'cancelled'
  isPaid: boolean
  price: number | null
  paymentStatus: string | null
}
