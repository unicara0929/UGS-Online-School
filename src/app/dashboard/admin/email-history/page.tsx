'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Mail,
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface EmailCampaign {
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
  } | null
}

export default function EmailHistoryPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // フィルター状態
  const [keyword, setKeyword] = useState('')
  const [sourceType, setSourceType] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // ページネーション
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchCampaigns()
  }, [page, sourceType])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (sourceType !== 'all') {
        params.append('sourceType', sourceType)
      }

      if (keyword) {
        params.append('keyword', keyword)
      }

      if (startDate) {
        params.append('startDate', startDate)
      }

      if (endDate) {
        params.append('endDate', endDate)
      }

      const response = await fetch(`/api/admin/email-history?${params}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('メール送信履歴の取得に失敗しました')
      }

      const data = await response.json()
      setCampaigns(data.data)
      setTotalPages(data.pagination.totalPages)
      setTotal(data.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchCampaigns()
  }

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case 'USER_MANAGEMENT':
        return 'ユーザー管理'
      case 'EVENT_MANAGEMENT':
        return 'イベント管理'
      default:
        return type
    }
  }

  const getSourceTypeBadgeVariant = (
    type: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case 'USER_MANAGEMENT':
        return 'default'
      case 'EVENT_MANAGEMENT':
        return 'secondary'
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">メール送信履歴</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    管理画面から送信されたメールの履歴を確認できます
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* フィルター */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="件名・本文で検索..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch}>検索</Button>
                </div>
              </div>

              <div>
                <select
                  value={sourceType}
                  onChange={(e) => {
                    setSourceType(e.target.value)
                    setPage(1)
                  }}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white"
                >
                  <option value="all">全ての送信元</option>
                  <option value="USER_MANAGEMENT">ユーザー管理</option>
                  <option value="EVENT_MANAGEMENT">イベント管理</option>
                </select>
              </div>

              <div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setKeyword('')
                    setSourceType('all')
                    setStartDate('')
                    setEndDate('')
                    setPage(1)
                    fetchCampaigns()
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  フィルターをクリア
                </Button>
              </div>
            </div>

            {/* 統計 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">総送信数</p>
                      <p className="text-2xl font-bold">{total}</p>
                    </div>
                    <Mail className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">成功</p>
                      <p className="text-2xl font-bold text-green-600">
                        {campaigns.reduce((sum, c) => sum + c.successCount, 0)}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">失敗</p>
                      <p className="text-2xl font-bold text-red-600">
                        {campaigns.reduce((sum, c) => sum + c.failedCount, 0)}
                      </p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* テーブル */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-600">読み込み中...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">メール送信履歴がありません</p>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>送信日時</TableHead>
                        <TableHead>送信元</TableHead>
                        <TableHead>件名</TableHead>
                        <TableHead className="text-center">送信数</TableHead>
                        <TableHead className="text-center">成功</TableHead>
                        <TableHead className="text-center">失敗</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow
                          key={campaign.id}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() =>
                            router.push(`/dashboard/admin/email-history/${campaign.id}`)
                          }
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              {formatDate(campaign.sentAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={getSourceTypeBadgeVariant(campaign.sourceType)}>
                                {getSourceTypeLabel(campaign.sourceType)}
                              </Badge>
                              {campaign.event && (
                                <p className="text-xs text-slate-600">{campaign.event.title}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md truncate">{campaign.subject}</div>
                            {campaign.templateType && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {campaign.templateType}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="h-4 w-4 text-slate-400" />
                              {campaign.totalCount}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {campaign.successCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {campaign.failedCount > 0 ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {campaign.failedCount}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/dashboard/admin/email-history/${campaign.id}`)
                              }}
                            >
                              詳細
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* ページネーション */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      全{total}件中 {(page - 1) * 20 + 1}～{Math.min(page * 20, total)}件を表示
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        前へ
                      </Button>
                      <div className="flex items-center gap-2 px-4">
                        <span className="text-sm">
                          {page} / {totalPages}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                      >
                        次へ
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
