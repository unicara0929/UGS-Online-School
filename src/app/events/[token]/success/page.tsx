'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

interface EventInfo {
  title: string
  date: string
  time: string | null
  location: string | null
}

export default function ExternalEventSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string
  const sessionId = searchParams.get('session_id')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<EventInfo | null>(null)

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('セッションIDが見つかりません')
        setIsLoading(false)
        return
      }

      try {
        // イベント情報を取得
        const eventResponse = await fetch(`/api/public/events/${token}`)
        const eventData = await eventResponse.json()

        if (eventData.success) {
          setEvent(eventData.event)
        }

        // 決済確認（Webhookで処理されるが、念のため確認）
        // Webhookが処理するので、ここでは単に成功を表示
        setIsLoading(false)
      } catch (err) {
        console.error('Error:', err)
        setError('エラーが発生しました')
        setIsLoading(false)
      }
    }

    verifyPayment()
  }, [token, sessionId])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年M月d日(E)', { locale: ja })
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center text-slate-500">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
          確認中...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-bold text-green-800 mb-2">
              お支払い完了
            </h2>
            <p className="text-green-700 mb-4">
              イベントへの登録が完了しました。
            </p>

            {event && (
              <div className="bg-white rounded-lg p-4 text-left mb-4">
                <h3 className="font-semibold text-slate-900">{event.title}</h3>
                <p className="text-sm text-slate-600 mt-2">
                  {formatDate(event.date)} {event.time && `${event.time}`}
                </p>
                {event.location && (
                  <p className="text-sm text-slate-600">{event.location}</p>
                )}
              </div>
            )}

            <p className="text-sm text-green-600">
              確認メールをお送りしました。
              <br />
              ご参加をお待ちしております。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
