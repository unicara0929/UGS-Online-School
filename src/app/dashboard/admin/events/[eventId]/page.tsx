'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Download,
  Loader2,
  Mail,
  Search,
  Users,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react'

type Participant = {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: string
  paymentStatus: string
  paidAmount: number | null
  registeredAt: string
  paidAt: string | null
  canceledAt: string | null
  cancelReason: string | null
}

type EventSummary = {
  totalCount: number
  paidCount: number
  pendingCount: number
  freeCount: number
  refundedCount: number
}

function EventDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  const [event, setEvent] = useState<any>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([])
  const [summary, setSummary] = useState<EventSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // フィルター状態
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // 参加者データ取得
  const fetchParticipants = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (paymentStatusFilter !== 'all') params.append('status', paymentStatusFilter)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/admin/events/${eventId}/participants?${params.toString()}`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '参加者情報の取得に失敗しました')
      }

      setEvent(data.event)
      setParticipants(data.participants)
      setFilteredParticipants(data.participants)
      setSummary(data.summary)
    } catch (err) {
      console.error('Failed to fetch participants:', err)
      setError(err instanceof Error ? err.message : '参加者情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (eventId) {
      fetchParticipants()
    }
  }, [eventId, paymentStatusFilter, roleFilter, searchQuery])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年M月d日(E) HH:mm', { locale: ja })
    } catch {
      return dateString
    }
  }

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return '支払い完了'
      case 'PENDING': return '支払い待ち'
      case 'FREE': return '無料'
      case 'REFUNDED': return '返金済み'
      case 'FAILED': return '失敗'
      default: return status
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-50 border-green-300 text-green-700'
      case 'PENDING': return 'bg-yellow-50 border-yellow-300 text-yellow-700'
      case 'FREE': return 'bg-blue-50 border-blue-300 text-blue-700'
      case 'REFUNDED': return 'bg-gray-50 border-gray-300 text-gray-700'
      case 'FAILED': return 'bg-red-50 border-red-300 text-red-700'
      default: return 'bg-gray-50 border-gray-300 text-gray-700'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'MEMBER': return 'UGS会員'
      case 'FP': return 'FPエイド'
      case 'MANAGER': return 'マネージャー'
      case 'ADMIN': return '管理者'
      default: return role
    }
  }

  const handleExportCSV = () => {
    window.location.href = `/api/admin/events/${eventId}/participants/export`
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <PageHeader title="イベント詳細" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 戻るボタン */}
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/admin/events')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              イベント一覧に戻る
            </Button>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* イベント情報サマリー */}
            {event && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">{event.title}</CardTitle>
                    {event.isPaid && (
                      <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700">
                        ¥{event.price?.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(event.date)}
                    </div>
                    {event.time && (
                      <div className="flex items-center text-sm text-slate-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {event.time}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 参加者サマリー */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">{summary.totalCount}</div>
                      <div className="text-xs text-slate-500 mt-1">総申込数</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{summary.paidCount}</div>
                      <div className="text-xs text-slate-500 mt-1">支払い完了</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{summary.pendingCount}</div>
                      <div className="text-xs text-slate-500 mt-1">支払い待ち</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{summary.freeCount}</div>
                      <div className="text-xs text-slate-500 mt-1">無料参加</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{summary.refundedCount}</div>
                      <div className="text-xs text-slate-500 mt-1">返金済み</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* フィルター・アクション */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* フィルター */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        支払いステータス
                      </label>
                      <select
                        value={paymentStatusFilter}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="all">全て</option>
                        <option value="PAID">支払い完了</option>
                        <option value="PENDING">支払い待ち</option>
                        <option value="FREE">無料</option>
                        <option value="REFUNDED">返金済み</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        ロール
                      </label>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="all">全て</option>
                        <option value="MEMBER">UGS会員</option>
                        <option value="FP">FPエイド</option>
                        <option value="MANAGER">マネージャー</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        検索
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="名前・メールで検索"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleExportCSV}
                      disabled={participants.length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSVエクスポート
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 参加者一覧テーブル */}
            <Card>
              <CardHeader>
                <CardTitle>参加者一覧</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredParticipants.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                    <p>参加者がいません</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">名前</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">メール</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ロール</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">支払いステータス</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">申込日時</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">支払い日時</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredParticipants.map((participant) => (
                          <tr key={participant.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-900">{participant.userName}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{participant.userEmail}</td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant="outline">{getRoleLabel(participant.userRole)}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant="outline" className={getPaymentStatusColor(participant.paymentStatus)}>
                                {getPaymentStatusLabel(participant.paymentStatus)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatDate(participant.registeredAt)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {participant.paidAt ? formatDate(participant.paidAt) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function EventDetailPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <EventDetailPageContent />
    </ProtectedRoute>
  )
}
