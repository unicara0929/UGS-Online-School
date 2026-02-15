'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, Key } from 'lucide-react'
import { authenticatedFetch } from '@/lib/utils/api-client'

interface AttendanceCodeInputProps {
  eventId: string
  eventTitle: string
  onSuccess?: () => void
}

export function AttendanceCodeInput({ eventId, eventTitle, onSuccess }: AttendanceCodeInputProps) {
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!code.trim()) {
      setMessage({ type: 'error', text: '参加コードを入力してください' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await authenticatedFetch('/api/events/submit-attendance-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          attendanceCode: code.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '出席確認に失敗しました')
      }

      setMessage({
        type: 'success',
        text: data.message || '出席が完了しました！'
      })
      setCode('')

      // 成功コールバックを実行
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 1500)
      }
    } catch (error) {
      console.error('Failed to submit attendance code:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '出席確認に失敗しました'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h3 className="font-semibold text-blue-900">参加コードで出席確認</h3>
          </div>

          <p className="text-sm text-blue-800">
            会場またはオンラインで表示されている参加コードを入力してください
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="text"
              placeholder="参加コード（アルファベット）"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isSubmitting}
              className="bg-white"
              maxLength={20}
            />

            <Button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  確認中...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  出席を確認
                </>
              )}
            </Button>
          </form>

          {message && (
            <div
              className={`text-sm p-3 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
