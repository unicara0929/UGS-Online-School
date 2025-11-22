'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, Clock, CheckCircle, Package, Truck, XCircle, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Order {
  id: string
  displayName: string
  displayNameKana: string
  phoneNumber: string
  email: string
  postalCode: string
  prefecture: string
  city: string
  addressLine1: string
  addressLine2: string | null
  quantity: number
  notes: string | null
  status: string
  adminNotes: string | null
  createdAt: string
  processedAt: string | null
  shippedAt: string | null
  completedAt: string | null
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  design: {
    id: string
    name: string
    previewUrl: string | null
  }
}

interface StatusCounts {
  total: number
  pending: number
  ordered: number
  shipped: number
  completed: number
  cancelled: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: '受付中', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
  ORDERED: { label: '発注済み', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Package },
  SHIPPED: { label: '発送済み', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Truck },
  COMPLETED: { label: '完了', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
  CANCELLED: { label: 'キャンセル', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: XCircle },
}

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'UGS会員',
  FP: 'FPエイド',
  MANAGER: 'マネージャー',
  ADMIN: '管理者',
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: '受付中' },
  { value: 'ORDERED', label: '発注済み' },
  { value: 'SHIPPED', label: '発送済み' },
  { value: 'COMPLETED', label: '完了' },
  { value: 'CANCELLED', label: 'キャンセル' },
]

function AdminBusinessCardContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [counts, setCounts] = useState<StatusCounts>({ total: 0, pending: 0, ordered: 0, shipped: 0, completed: 0, cancelled: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const url = filterStatus
        ? `/api/admin/business-card/orders?status=${filterStatus}`
        : '/api/admin/business-card/orders'
      const response = await fetch(url, { credentials: 'include' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || '名刺注文一覧の取得に失敗しました')
      }
      setOrders(data.orders)
      setCounts(data.counts)
    } catch (err) {
      setError(err instanceof Error ? err.message : '名刺注文一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const toggleExpanded = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId)
    try {
      const response = await fetch(`/api/admin/business-card/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'ステータスの更新に失敗しました')
      }
      fetchOrders()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ステータスの更新に失敗しました')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="名刺注文管理" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="名刺注文管理" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4">
                <p className="text-sm text-red-600">{error}</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <PageHeader title="名刺注文管理" />
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-6xl mx-auto">
            {/* ステータス別カウント */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <Card
                className={`cursor-pointer transition-all ${filterStatus === null ? 'ring-2 ring-slate-900' : ''}`}
                onClick={() => setFilterStatus(null)}
              >
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{counts.total}</p>
                  <p className="text-sm text-slate-500">全件</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${filterStatus === 'PENDING' ? 'ring-2 ring-yellow-500' : ''}`}
                onClick={() => setFilterStatus('PENDING')}
              >
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{counts.pending}</p>
                  <p className="text-sm text-slate-500">受付中</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${filterStatus === 'ORDERED' ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setFilterStatus('ORDERED')}
              >
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{counts.ordered}</p>
                  <p className="text-sm text-slate-500">発注済み</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${filterStatus === 'SHIPPED' ? 'ring-2 ring-purple-500' : ''}`}
                onClick={() => setFilterStatus('SHIPPED')}
              >
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{counts.shipped}</p>
                  <p className="text-sm text-slate-500">発送済み</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${filterStatus === 'COMPLETED' ? 'ring-2 ring-green-500' : ''}`}
                onClick={() => setFilterStatus('COMPLETED')}
              >
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{counts.completed}</p>
                  <p className="text-sm text-slate-500">完了</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${filterStatus === 'CANCELLED' ? 'ring-2 ring-slate-500' : ''}`}
                onClick={() => setFilterStatus('CANCELLED')}
              >
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-600">{counts.cancelled}</p>
                  <p className="text-sm text-slate-500">キャンセル</p>
                </CardContent>
              </Card>
            </div>

            {/* 注文一覧 */}
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">
                    {filterStatus ? `${STATUS_CONFIG[filterStatus]?.label || filterStatus}の注文はありません` : '名刺注文がありません'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const statusConfig = getStatusConfig(order.status)
                  const StatusIcon = statusConfig.icon
                  const isExpanded = expandedOrders.has(order.id)

                  return (
                    <Card key={order.id}>
                      <CardContent className="p-6">
                        {/* ヘッダー行 */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={statusConfig.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                              <span className="text-sm text-slate-500">
                                {format(new Date(order.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                              </span>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                              <h3 className="font-semibold text-slate-900">{order.displayName}</h3>
                              <span className="text-sm text-slate-600">
                                申請者: {order.user.name} ({ROLE_LABELS[order.user.role] || order.user.role})
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                              <span>デザイン: {order.design.name}</span>
                              <span>部数: {order.quantity}枚</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={order.status}
                              onChange={(e) => updateStatus(order.id, e.target.value)}
                              disabled={updatingOrderId === order.id}
                              className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(order.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* 詳細表示 */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                              {/* 名刺に印字する情報 */}
                              <div>
                                <h4 className="font-medium text-slate-700 mb-2">名刺に印字する情報</h4>
                                <dl className="space-y-1 text-slate-600">
                                  <div><dt className="inline text-slate-400">表示名: </dt><dd className="inline">{order.displayName}</dd></div>
                                  <div><dt className="inline text-slate-400">フリガナ: </dt><dd className="inline">{order.displayNameKana}</dd></div>
                                  <div><dt className="inline text-slate-400">電話番号: </dt><dd className="inline">{order.phoneNumber}</dd></div>
                                  <div><dt className="inline text-slate-400">メール: </dt><dd className="inline">{order.email}</dd></div>
                                </dl>
                              </div>

                              {/* 郵送先住所 */}
                              <div>
                                <h4 className="font-medium text-slate-700 mb-2">郵送先住所</h4>
                                <p className="text-slate-600">
                                  〒{order.postalCode}<br />
                                  {order.prefecture}{order.city}{order.addressLine1}
                                  {order.addressLine2 && <><br />{order.addressLine2}</>}
                                </p>
                              </div>

                              {/* 申請者情報 */}
                              <div>
                                <h4 className="font-medium text-slate-700 mb-2">申請者情報</h4>
                                <dl className="space-y-1 text-slate-600">
                                  <div><dt className="inline text-slate-400">氏名: </dt><dd className="inline">{order.user.name}</dd></div>
                                  <div><dt className="inline text-slate-400">メール: </dt><dd className="inline">{order.user.email}</dd></div>
                                  <div><dt className="inline text-slate-400">ロール: </dt><dd className="inline">{ROLE_LABELS[order.user.role] || order.user.role}</dd></div>
                                </dl>
                              </div>
                            </div>

                            {/* 備考 */}
                            {order.notes && (
                              <div className="mt-4">
                                <h4 className="font-medium text-slate-700 mb-1">ユーザーからの備考</h4>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">{order.notes}</p>
                              </div>
                            )}

                            {/* タイムライン */}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                              <h4 className="font-medium text-slate-700 mb-2">処理履歴</h4>
                              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                <span>申請: {format(new Date(order.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}</span>
                                {order.processedAt && <span>発注: {format(new Date(order.processedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}</span>}
                                {order.shippedAt && <span>発送: {format(new Date(order.shippedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}</span>}
                                {order.completedAt && <span>完了: {format(new Date(order.completedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}</span>}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminBusinessCardPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminBusinessCardContent />
    </ProtectedRoute>
  )
}
