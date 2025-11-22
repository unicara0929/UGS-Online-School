'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, Plus, Clock, CheckCircle, Package, Truck, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Order {
  id: string
  displayName: string
  displayNameKana: string
  roleTitle: string | null
  company: string | null
  phoneNumber: string
  email: string
  websiteUrl: string | null
  postalCode: string
  prefecture: string
  city: string
  addressLine1: string
  addressLine2: string | null
  quantity: number
  notes: string | null
  status: string
  createdAt: string
  design: {
    id: string
    name: string
    previewUrl: string | null
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: '受付中', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  ORDERED: { label: '発注済み', color: 'bg-blue-100 text-blue-800', icon: Package },
  SHIPPED: { label: '発送済み', color: 'bg-purple-100 text-purple-800', icon: Truck },
  COMPLETED: { label: '完了', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: 'キャンセル', color: 'bg-slate-100 text-slate-800', icon: XCircle },
}

function BusinessCardHistoryContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/business-card/orders', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || '注文履歴の取得に失敗しました')
      }
      setOrders(data.orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : '注文履歴の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="名刺注文履歴" />
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
          <PageHeader title="名刺注文履歴" />
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
        <PageHeader title="名刺注文履歴" />
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">注文一覧</h2>
              <Link href="/dashboard/business-card/order">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  新規注文
                </Button>
              </Link>
            </div>

            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">まだ名刺の注文履歴がありません</p>
                  <Link href="/dashboard/business-card/order">
                    <Button>名刺を注文する</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const statusConfig = getStatusConfig(order.status)
                  const StatusIcon = statusConfig.icon
                  return (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-slate-900">{order.displayName}</h3>
                              <Badge className={statusConfig.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-slate-600">
                              <div>
                                <span className="text-slate-400">デザイン: </span>
                                {order.design.name}
                              </div>
                              <div>
                                <span className="text-slate-400">部数: </span>
                                {order.quantity}枚
                              </div>
                              <div>
                                <span className="text-slate-400">注文日: </span>
                                {format(new Date(order.createdAt), 'yyyy/MM/dd', { locale: ja })}
                              </div>
                              {order.roleTitle && (
                                <div>
                                  <span className="text-slate-400">ロール: </span>
                                  {order.roleTitle}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                          >
                            {selectedOrder?.id === order.id ? '閉じる' : '詳細を見る'}
                          </Button>
                        </div>

                        {selectedOrder?.id === order.id && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <h4 className="font-medium text-slate-700 mb-2">名刺に印字する情報</h4>
                                <dl className="space-y-1 text-slate-600">
                                  <div><dt className="inline text-slate-400">表示名: </dt><dd className="inline">{order.displayName}</dd></div>
                                  <div><dt className="inline text-slate-400">フリガナ: </dt><dd className="inline">{order.displayNameKana}</dd></div>
                                  {order.roleTitle && <div><dt className="inline text-slate-400">ロール表記: </dt><dd className="inline">{order.roleTitle}</dd></div>}
                                  {order.company && <div><dt className="inline text-slate-400">所属: </dt><dd className="inline">{order.company}</dd></div>}
                                  <div><dt className="inline text-slate-400">電話番号: </dt><dd className="inline">{order.phoneNumber}</dd></div>
                                  <div><dt className="inline text-slate-400">メール: </dt><dd className="inline">{order.email}</dd></div>
                                  {order.websiteUrl && <div><dt className="inline text-slate-400">URL: </dt><dd className="inline">{order.websiteUrl}</dd></div>}
                                </dl>
                              </div>
                              <div>
                                <h4 className="font-medium text-slate-700 mb-2">郵送先住所</h4>
                                <p className="text-slate-600">
                                  〒{order.postalCode}<br />
                                  {order.prefecture}{order.city}{order.addressLine1}
                                  {order.addressLine2 && <><br />{order.addressLine2}</>}
                                </p>
                                {order.notes && (
                                  <div className="mt-4">
                                    <h4 className="font-medium text-slate-700 mb-1">備考</h4>
                                    <p className="text-slate-600 whitespace-pre-wrap">{order.notes}</p>
                                  </div>
                                )}
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

export default function BusinessCardHistoryPage() {
  return (
    <ProtectedRoute requiredRoles={['fp', 'manager', 'admin']}>
      <BusinessCardHistoryContent />
    </ProtectedRoute>
  )
}
