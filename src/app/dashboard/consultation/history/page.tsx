'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

// ステータスの表示設定
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  PENDING: { label: '未対応', variant: 'secondary' },
  IN_PROGRESS: { label: '対応中', variant: 'default' },
  COMPLETED: { label: '完了', variant: 'outline' },
}

// 連絡方法のラベル
const CONTACT_METHOD_LABELS: Record<string, string> = {
  EMAIL: 'メール',
  PHONE: '電話',
  LINE: 'LINE',
}

interface Consultation {
  id: string
  type: string
  typeLabel: string
  content: string
  preferredContact: string
  preferredDates: string[]
  attachmentUrl: string | null
  attachmentName: string | null
  status: string
  completedAt: string | null
  createdAt: string
  handler: { id: string; name: string } | null
}

export default function ConsultationHistoryPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/consultations')
        if (!res.ok) throw new Error('履歴の取得に失敗しました')
        const data = await res.json()
        setConsultations(data.consultations)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  // 日時フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/dashboard/consultation" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
        個別相談トップに戻る
      </Link>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">相談履歴</h1>
          <p className="text-muted-foreground mt-1">
            過去の相談内容と対応状況を確認できます
          </p>
        </div>
        <Link href="/dashboard/consultation">
          <Button>新しい相談をする</Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {consultations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
              <p className="text-muted-foreground">まだ相談履歴がありません</p>
              <Link href="/dashboard/consultation" className="mt-4 inline-block">
                <Button>最初の相談をする</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {consultations.map((consultation) => (
            <Card key={consultation.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {consultation.typeLabel}相談
                      <Badge variant={STATUS_CONFIG[consultation.status]?.variant || 'secondary'}>
                        {STATUS_CONFIG[consultation.status]?.label || consultation.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Calendar className="w-4 h-4" aria-hidden="true" />
                      {formatDate(consultation.createdAt)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 相談内容 */}
                  <div>
                    <h4 className="text-sm font-medium mb-1">相談内容</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {consultation.content}
                    </p>
                  </div>

                  {/* 希望連絡方法 */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      {consultation.preferredContact === 'EMAIL' && <Mail className="w-4 h-4" aria-hidden="true" />}
                      {consultation.preferredContact === 'PHONE' && <Phone className="w-4 h-4" aria-hidden="true" />}
                      {consultation.preferredContact === 'LINE' && <MessageSquare className="w-4 h-4" aria-hidden="true" />}
                      <span>希望連絡方法: {CONTACT_METHOD_LABELS[consultation.preferredContact]}</span>
                    </div>
                  </div>

                  {/* 希望日時 */}
                  <div>
                    <h4 className="text-sm font-medium mb-1">希望日時</h4>
                    <div className="flex flex-wrap gap-2">
                      {consultation.preferredDates.map((date, index) => (
                        <Badge key={index} variant="outline">
                          {formatDate(date)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 添付ファイル */}
                  {consultation.attachmentName && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4" aria-hidden="true" />
                      <span>添付ファイル: {consultation.attachmentName}</span>
                    </div>
                  )}

                  {/* 対応者・完了日時 */}
                  {consultation.status === 'COMPLETED' && (
                    <div className="pt-3 border-t">
                      <div className="text-sm text-muted-foreground">
                        {consultation.handler && (
                          <span>対応者: {consultation.handler.name}</span>
                        )}
                        {consultation.completedAt && (
                          <span className="ml-4">
                            完了日時: {formatDate(consultation.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}
