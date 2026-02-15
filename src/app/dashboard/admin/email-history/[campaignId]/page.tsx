'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Mail,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

interface EmailLog {
  id: string
  userId: string
  email: string
  status: 'SENT' | 'FAILED' | 'BOUNCED' | 'INVALID'
  errorMessage: string | null
  sentAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface EmailCampaignDetail {
  id: string
  subject: string
  body: string
  templateType: string | null
  sourceType: 'USER_MANAGEMENT' | 'EVENT_MANAGEMENT'
  eventId: string | null
  totalCount: number
  successCount: number
  failedCount: number
  sentAt: string
  event: {
    id: string
    title: string
    date: string
  } | null
  logs: EmailLog[]
}

export default function EmailHistoryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.campaignId as string

  const [campaign, setCampaign] = useState<EmailCampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [resending, setResending] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchCampaign()
  }, [campaignId])

  const fetchCampaign = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/email-history/${campaignId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('メール送信履歴の取得に失敗しました')
      }

      const data = await response.json()
      setCampaign(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (status: string) => {
    if (!campaign) return

    const filteredLogs =
      status === 'all'
        ? campaign.logs
        : campaign.logs.filter((log) => log.status === status)

    const newSelected = new Set(selectedUserIds)
    if (filteredLogs.every((log) => newSelected.has(log.userId))) {
      // 全て選択済みの場合は解除
      filteredLogs.forEach((log) => newSelected.delete(log.userId))
    } else {
      // 未選択があれば全て選択
      filteredLogs.forEach((log) => newSelected.add(log.userId))
    }
    setSelectedUserIds(newSelected)
  }

  const handleToggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUserIds(newSelected)
  }

  const handleResend = async () => {
    if (selectedUserIds.size === 0) {
      alert('再送対象のユーザーを選択してください')
      return
    }

    if (!confirm(`${selectedUserIds.size}名のユーザーにメールを再送しますか？`)) {
      return
    }

    try {
      setResending(true)
      const response = await fetch(`/api/admin/email-history/${campaignId}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
        }),
      })

      if (!response.ok) {
        throw new Error('メール再送に失敗しました')
      }

      const data = await response.json()
      alert(data.message)
      setSelectedUserIds(new Set())
      fetchCampaign()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setResending(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SENT':
        return '送信成功'
      case 'FAILED':
        return '送信失敗'
      case 'BOUNCED':
        return 'バウンス'
      case 'INVALID':
        return '無効なアドレス'
      default:
        return status
    }
  }

  const getStatusBadgeVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'SENT':
        return 'default'
      case 'FAILED':
      case 'BOUNCED':
      case 'INVALID':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredLogs = campaign
    ? filterStatus === 'all'
      ? campaign.logs
      : campaign.logs.filter((log) => log.status === filterStatus)
    : []

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'メール送信履歴が見つかりません'}</p>
          <Button className="mt-4" onClick={() => router.back()}>
            戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push('/dashboard/admin/email-history')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          一覧に戻る
        </Button>

        {/* キャンペーン概要 */}
        <Card className="shadow-xl mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{campaign.subject}</CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    {formatDate(campaign.sentAt)}
                  </div>
                  <Badge>{campaign.sourceType === 'USER_MANAGEMENT' ? 'ユーザー管理' : 'イベント管理'}</Badge>
                  {campaign.event && (
                    <span className="text-slate-600">
                      イベント: {campaign.event.title}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 統計 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">総送信数</p>
                    <p className="text-2xl font-bold">{campaign.totalCount}</p>
                  </div>
                  <Users className="h-8 w-8 text-slate-400" aria-hidden="true" />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700">送信成功</p>
                    <p className="text-2xl font-bold text-green-700">{campaign.successCount}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" aria-hidden="true" />
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700">送信失敗</p>
                    <p className="text-2xl font-bold text-red-700">{campaign.failedCount}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* メール本文 */}
            <div>
              <h3 className="font-semibold mb-2">メール本文</h3>
              <div className="bg-slate-100 p-4 rounded-lg whitespace-pre-wrap text-sm">
                {campaign.body}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 配信ログ */}
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>配信ログ ({filteredLogs.length}件)</CardTitle>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-10 px-3 border border-slate-300 rounded-md bg-white"
                >
                  <option value="all">全てのステータス</option>
                  <option value="SENT">送信成功のみ</option>
                  <option value="FAILED">送信失敗のみ</option>
                  <option value="BOUNCED">バウンスのみ</option>
                </select>

                {selectedUserIds.size > 0 && (
                  <Button onClick={handleResend} disabled={resending}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${resending ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {resending ? '再送中...' : `選択中 (${selectedUserIds.size})`}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => handleSelectAll(filterStatus === 'all' ? 'FAILED' : filterStatus)}
                >
                  {filterStatus === 'all' ? 'エラーのみ選択' : '全て選択'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>ユーザー名</TableHead>
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>エラー内容</TableHead>
                    <TableHead>送信日時</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(log.userId)}
                          onChange={() => handleToggleUser(log.userId)}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{log.user.name}</TableCell>
                      <TableCell>{log.email}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(log.status)}>
                          {getStatusLabel(log.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.errorMessage ? (
                          <div className="flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle className="h-4 w-4" aria-hidden="true" />
                            {log.errorMessage}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDate(log.sentAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
