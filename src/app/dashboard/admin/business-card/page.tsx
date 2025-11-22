'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Loader2,
  CreditCard,
  CheckCircle,
  Package,
  Truck,
  XCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Banknote,
  Palette,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Save,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

// ============ Types ============
interface Order {
  id: string
  displayName: string
  displayNameKana: string
  phoneNumber: string
  email: string
  deliveryMethod: 'PICKUP' | 'SHIPPING'
  postalCode: string | null
  prefecture: string | null
  city: string | null
  addressLine1: string | null
  addressLine2: string | null
  quantity: number
  notes: string | null
  status: string
  paymentStatus: string
  paidAmount: number | null
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
  paid: number
  ordered: number
  shipped: number
  completed: number
  cancelled: number
}

interface Design {
  id: string
  name: string
  description: string | null
  previewUrl: string | null
  isActive: boolean
  order: number
  _count: {
    orders: number
  }
}

// ============ Constants ============
const DELIVERY_LABELS: Record<string, string> = {
  PICKUP: 'UGS本社で手渡し',
  SHIPPING: 'レターパック郵送',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: '決済待ち', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Banknote },
  PAID: { label: '決済完了', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
  ORDERED: { label: '発注済み', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Package },
  SHIPPED: { label: '発送済み', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Truck },
  COMPLETED: { label: '完了', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle },
  CANCELLED: { label: 'キャンセル', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: XCircle },
}

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'UGS会員',
  FP: 'FPエイド',
  MANAGER: 'マネージャー',
  ADMIN: '管理者',
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: '決済待ち' },
  { value: 'PAID', label: '決済完了' },
  { value: 'ORDERED', label: '発注済み' },
  { value: 'SHIPPED', label: '発送済み' },
  { value: 'COMPLETED', label: '完了' },
  { value: 'CANCELLED', label: 'キャンセル' },
]

// ============ Design Management Component ============
function DesignManagement() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingDesign, setEditingDesign] = useState<Design | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPreviewUrl, setFormPreviewUrl] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formOrder, setFormOrder] = useState(0)

  const fetchDesigns = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/business-card/designs', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'デザイン一覧の取得に失敗しました')
      }
      setDesigns(data.designs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'デザイン一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDesigns()
  }, [fetchDesigns])

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormPreviewUrl('')
    setFormIsActive(true)
    setFormOrder(designs.length)
    setEditingDesign(null)
    setIsCreating(false)
  }

  const startEditing = (design: Design) => {
    setEditingDesign(design)
    setFormName(design.name)
    setFormDescription(design.description || '')
    setFormPreviewUrl(design.previewUrl || '')
    setFormIsActive(design.isActive)
    setFormOrder(design.order)
    setIsCreating(false)
  }

  const startCreating = () => {
    resetForm()
    setFormOrder(designs.length)
    setIsCreating(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      alert('デザイン名を入力してください')
      return
    }

    setIsSaving(true)
    try {
      const body = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        previewUrl: formPreviewUrl.trim() || null,
        isActive: formIsActive,
        order: formOrder,
      }

      let response: Response
      if (editingDesign) {
        response = await fetch(`/api/admin/business-card/designs/${editingDesign.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })
      } else {
        response = await fetch('/api/admin/business-card/designs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })
      }

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || '保存に失敗しました')
      }

      resetForm()
      fetchDesigns()
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (design: Design) => {
    if (design._count.orders > 0) {
      alert('このデザインは注文で使用されているため削除できません。無効化してください。')
      return
    }

    if (!confirm(`「${design.name}」を削除しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/business-card/designs/${design.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || '削除に失敗しました')
      }
      fetchDesigns()
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  const toggleActive = async (design: Design) => {
    try {
      const response = await fetch(`/api/admin/business-card/designs/${design.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !design.isActive }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || '更新に失敗しました')
      }
      fetchDesigns()
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新に失敗しました')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4">
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 新規作成ボタン */}
      {!isCreating && !editingDesign && (
        <div className="flex justify-end">
          <Button onClick={startCreating} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            新規デザイン追加
          </Button>
        </div>
      )}

      {/* 作成/編集フォーム */}
      {(isCreating || editingDesign) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingDesign ? 'デザインを編集' : '新規デザイン作成'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="design-name">デザイン名 *</Label>
                <Input
                  id="design-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: シンプル、写真あり"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="design-order">表示順</Label>
                <Input
                  id="design-order"
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="design-description">説明</Label>
              <Textarea
                id="design-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="デザインの説明（ユーザーに表示されます）"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="design-preview">プレビュー画像URL</Label>
              <Input
                id="design-preview"
                value={formPreviewUrl}
                onChange={(e) => setFormPreviewUrl(e.target.value)}
                placeholder="https://example.com/preview.jpg"
              />
              {formPreviewUrl && (
                <div className="mt-2">
                  <img
                    src={formPreviewUrl}
                    alt="プレビュー"
                    className="max-w-xs rounded-lg border border-slate-200"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="design-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
              <Label htmlFor="design-active">有効（ユーザーが選択可能）</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存
              </Button>
              <Button variant="outline" onClick={resetForm} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* デザイン一覧 */}
      {designs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Palette className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">デザインがありません</p>
            {!isCreating && (
              <Button onClick={startCreating}>最初のデザインを追加</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {designs.map((design) => (
            <Card
              key={design.id}
              className={`transition-all ${!design.isActive ? 'opacity-60' : ''} ${editingDesign?.id === design.id ? 'ring-2 ring-slate-900' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* プレビュー画像 */}
                  <div className="flex-shrink-0">
                    {design.previewUrl ? (
                      <img
                        src={design.previewUrl}
                        alt={design.name}
                        className="w-20 h-14 object-cover rounded-lg border border-slate-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`w-20 h-14 bg-slate-100 rounded-lg flex items-center justify-center ${design.previewUrl ? 'hidden' : ''}`}>
                      <ImageIcon className="h-6 w-6 text-slate-400" />
                    </div>
                  </div>

                  {/* デザイン情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">{design.name}</h3>
                      <Badge variant={design.isActive ? 'default' : 'secondary'}>
                        {design.isActive ? '有効' : '無効'}
                      </Badge>
                    </div>
                    {design.description && (
                      <p className="text-sm text-slate-600 truncate">{design.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      表示順: {design.order} ・ 注文数: {design._count.orders}件
                    </p>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(design)}
                      title={design.isActive ? '無効にする' : '有効にする'}
                    >
                      <Switch checked={design.isActive} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(design)}
                      disabled={!!editingDesign || isCreating}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(design)}
                      disabled={design._count.orders > 0}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title={design._count.orders > 0 ? '注文で使用中のため削除できません' : '削除'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ Order Management Component ============
function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [counts, setCounts] = useState<StatusCounts>({ total: 0, pending: 0, paid: 0, ordered: 0, shipped: 0, completed: 0, cancelled: 0 })
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4">
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ステータス別カウント */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
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
          className={`cursor-pointer transition-all ${filterStatus === 'PENDING' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => setFilterStatus('PENDING')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{counts.pending}</p>
            <p className="text-sm text-slate-500">決済待ち</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${filterStatus === 'PAID' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setFilterStatus('PAID')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{counts.paid}</p>
            <p className="text-sm text-slate-500">決済完了</p>
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
          className={`cursor-pointer transition-all ${filterStatus === 'COMPLETED' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setFilterStatus('COMPLETED')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{counts.completed}</p>
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
                        <span className="flex items-center gap-1">
                          {order.deliveryMethod === 'PICKUP' ? <MapPin className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                          {DELIVERY_LABELS[order.deliveryMethod]}
                        </span>
                        <span>金額: ¥{order.paidAmount?.toLocaleString() || '-'}</span>
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

                        {/* 受取方法 */}
                        <div>
                          <h4 className="font-medium text-slate-700 mb-2">受取方法</h4>
                          <p className="text-slate-600 mb-2">
                            {order.deliveryMethod === 'PICKUP' ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                UGS本社（愛知県名古屋市）で手渡し
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Truck className="h-4 w-4" />
                                レターパック郵送
                              </span>
                            )}
                          </p>
                          {order.deliveryMethod === 'SHIPPING' && order.postalCode && (
                            <div className="mt-2">
                              <p className="text-sm text-slate-500 mb-1">郵送先:</p>
                              <p className="text-slate-600">
                                〒{order.postalCode}<br />
                                {order.prefecture}{order.city}{order.addressLine1}
                                {order.addressLine2 && <><br />{order.addressLine2}</>}
                              </p>
                            </div>
                          )}
                          <p className="mt-2 text-sm">
                            <span className="text-slate-400">決済金額: </span>
                            <span className="font-medium">¥{order.paidAmount?.toLocaleString() || '-'}</span>
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
  )
}

// ============ Main Component ============
function AdminBusinessCardContent() {
  const [activeTab, setActiveTab] = useState<'orders' | 'designs'>('orders')

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <PageHeader title="名刺注文管理" />
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-6xl mx-auto">
            {/* タブ切り替え */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={activeTab === 'orders' ? 'default' : 'outline'}
                onClick={() => setActiveTab('orders')}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                注文管理
              </Button>
              <Button
                variant={activeTab === 'designs' ? 'default' : 'outline'}
                onClick={() => setActiveTab('designs')}
                className="flex items-center gap-2"
              >
                <Palette className="h-4 w-4" />
                デザイン管理
              </Button>
            </div>

            {/* タブコンテンツ */}
            {activeTab === 'orders' ? <OrderManagement /> : <DesignManagement />}
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
