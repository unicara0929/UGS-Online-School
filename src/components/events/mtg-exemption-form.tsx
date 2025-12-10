'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, FileX, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'
import { authenticatedFetch } from '@/lib/utils/api-client'

interface MtgExemptionFormProps {
  eventId: string
  eventTitle: string
  userName: string
  memberId: string
  onSuccess?: () => void
}

interface ExemptionData {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reason: string
  adminNotes?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export function MtgExemptionForm({
  eventId,
  eventTitle,
  userName,
  memberId,
  onSuccess,
}: MtgExemptionFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [existingExemption, setExistingExemption] = useState<ExemptionData | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 既存の申請を取得
  useEffect(() => {
    const fetchExemption = async () => {
      if (!isOpen) return

      setIsLoading(true)
      try {
        const response = await authenticatedFetch(`/api/events/exemption?eventId=${eventId}`)
        const data = await response.json()

        if (data.success && data.exemption) {
          setExistingExemption(data.exemption)
          setReason(data.exemption.reason)
        }
      } catch (error) {
        console.error('Failed to fetch exemption:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExemption()
  }, [eventId, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // バリデーション
    const trimmedReason = reason.trim()
    if (trimmedReason.length < 20) {
      setMessage({ type: 'error', text: '不参加理由は20文字以上で入力してください' })
      return
    }
    if (trimmedReason.length > 1000) {
      setMessage({ type: 'error', text: '不参加理由は1000文字以内で入力してください' })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authenticatedFetch('/api/events/exemption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          reason: trimmedReason,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '申請に失敗しました')
      }

      setMessage({ type: 'success', text: data.message })
      setExistingExemption(data.exemption)

      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to submit exemption:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '申請に失敗しました',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            審査中
          </Badge>
        )
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            承認
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            却下
          </Badge>
        )
      default:
        return null
    }
  }

  // 既に承認/却下済みの場合はステータス表示のみ
  if (existingExemption && existingExemption.status !== 'PENDING') {
    return (
      <Card className={existingExemption.status === 'APPROVED' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {existingExemption.status === 'APPROVED' ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600" />
            )}
            <div>
              <p className={`font-semibold ${existingExemption.status === 'APPROVED' ? 'text-green-800' : 'text-red-800'}`}>
                {existingExemption.status === 'APPROVED' ? '免除が承認されました' : '免除申請が却下されました'}
              </p>
              {existingExemption.adminNotes && (
                <p className="text-sm mt-1 text-slate-600">管理者コメント: {existingExemption.adminNotes}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <FileX className="h-4 w-4 mr-2" />
          {existingExemption ? '免除申請を編集' : '全体MTG免除申請'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>全体MTG免除申請</DialogTitle>
          <DialogDescription>
            やむを得ない事情で参加できない場合、事前に免除申請を行ってください。
            承認された場合、参加条件を満たしたものとみなします。
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 既存申請がある場合のステータス表示 */}
            {existingExemption && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">申請状況:</span>
                {getStatusBadge(existingExemption.status)}
              </div>
            )}

            {/* イベント名（自動入力） */}
            <div className="space-y-2">
              <Label>対象イベント</Label>
              <Input value={eventTitle} disabled className="bg-slate-50" />
            </div>

            {/* 会員ID（自動紐付け・表示のみ） */}
            <div className="space-y-2">
              <Label>会員ID</Label>
              <Input value={memberId} disabled className="bg-slate-50" />
            </div>

            {/* 名前（自動紐付け・表示のみ） */}
            <div className="space-y-2">
              <Label>氏名</Label>
              <Input value={userName} disabled className="bg-slate-50" />
            </div>

            {/* 不参加理由（必須） */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                不参加理由 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="やむを得ない理由を詳しくご記入ください（例: 冠婚葬祭で終日参加が難しいため、家族の急な入院対応のため など）"
                rows={5}
                required
                disabled={isSubmitting}
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>20文字以上、1000文字以内</span>
                <span className={reason.length < 20 || reason.length > 1000 ? 'text-red-500' : ''}>
                  {reason.length}/1000
                </span>
              </div>
            </div>

            {/* 注意事項 */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                免除申請は管理者による審査があります。承認された場合のみ、不参加でも降格の対象になりません。
                虚偽の申請は厳正に対処されます。
              </AlertDescription>
            </Alert>

            {/* メッセージ表示 */}
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

            {/* 送信ボタン */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || reason.trim().length < 20}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  送信中...
                </>
              ) : existingExemption ? (
                '申請内容を更新'
              ) : (
                '免除を申請する'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
