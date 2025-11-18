'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  Mail,
  Calendar,
  CreditCard,
  ArrowLeft,
  Shield,
  Activity,
  FileText,
  Edit
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { getRoleLabel, getRoleBadgeVariant } from '@/lib/utils/user-helpers'

// =====================================
// 定数
// =====================================

/** 利用可能なユーザーロール */
const USER_ROLES = [
  { value: 'MEMBER', label: 'メンバー' },
  { value: 'FP', label: 'FPエイド' },
  { value: 'MANAGER', label: 'マネージャー' },
  { value: 'ADMIN', label: '管理者' },
] as const

/** 会員ステータスのオプション */
const MEMBERSHIP_STATUS_OPTIONS = [
  { value: 'PENDING', label: '仮登録' },
  { value: 'ACTIVE', label: '有効会員' },
  { value: 'SUSPENDED', label: '休会中' },
  { value: 'PAST_DUE', label: '支払い遅延' },
  { value: 'DELINQUENT', label: '長期滞納' },
  { value: 'CANCELED', label: '退会済み' },
  { value: 'TERMINATED', label: '強制解約' },
  { value: 'EXPIRED', label: '期限切れ' },
] as const

interface UserDetail {
  id: string
  email: string
  name: string
  role: string
  membershipStatus: string
  membershipStatusReason?: string
  membershipStatusChangedAt?: string
  membershipStatusChangedBy?: string
  createdAt: string
  suspensionStartDate?: string
  suspensionEndDate?: string
  canceledAt?: string
  cancellationReason?: string
  delinquentSince?: string
  reactivatedAt?: string
  subscription?: any
  referralsGiven?: any[]
  referralsReceived?: any[]
  supabaseAuth?: any
  stripeCustomer?: any
  invoices?: any[]
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 編集フォームの状態
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
    membershipStatus: '',
    membershipStatusReason: ''
  })

  useEffect(() => {
    if (userId) {
      fetchUserDetail()
    }
  }, [userId])

  const fetchUserDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('ユーザー情報の取得に失敗しました')
      }
      const data = await response.json()
      setUser(data.user)
      // 編集フォームを初期化
      setEditForm({
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        membershipStatus: data.user.membershipStatus,
        membershipStatusReason: data.user.membershipStatusReason || ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        throw new Error('ユーザー情報の更新に失敗しました')
      }

      const data = await response.json()
      setUser(data.user)
      setIsEditing(false)
      alert('ユーザー情報を更新しました')
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // 編集をキャンセルして元の値に戻す
    if (user) {
      setEditForm({
        name: user.name,
        email: user.email,
        role: user.role,
        membershipStatus: user.membershipStatus,
        membershipStatusReason: user.membershipStatusReason || ''
      })
    }
    setIsEditing(false)
  }

  const getMembershipStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: '仮登録', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      ACTIVE: { label: '有効会員', className: 'bg-green-100 text-green-800 border-green-200' },
      SUSPENDED: { label: '休会中', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      PAST_DUE: { label: '支払い遅延', className: 'bg-orange-100 text-orange-800 border-orange-200' },
      DELINQUENT: { label: '長期滞納', className: 'bg-red-100 text-red-800 border-red-200' },
      CANCELED: { label: '退会済み', className: 'bg-gray-100 text-gray-800 border-gray-200' },
      TERMINATED: { label: '強制解約', className: 'bg-purple-100 text-purple-800 border-purple-200' },
      EXPIRED: { label: '期限切れ', className: 'bg-slate-100 text-slate-800 border-slate-200' },
    }
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'ユーザーが見つかりません'}</p>
          <Button onClick={() => router.back()} className="mt-4">
            戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>戻る</span>
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">ユーザー詳細</h1>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  {isSaving ? '保存中...' : '保存'}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Edit className="h-4 w-4" />
                <span>編集</span>
              </Button>
            )}
          </div>
        </div>

        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              基本情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">名前</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-900">{user.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">メールアドレス</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-lg text-slate-900">{user.email}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">ロール</label>
                {isEditing ? (
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {USER_ROLES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1">
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">会員ステータス</label>
                {isEditing ? (
                  <select
                    value={editForm.membershipStatus}
                    onChange={(e) => setEditForm({ ...editForm, membershipStatus: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {MEMBERSHIP_STATUS_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1">
                    {getMembershipStatusBadge(user.membershipStatus)}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">登録日</label>
                <p className="text-slate-900">{formatDate(user.createdAt)}</p>
              </div>
              {user.membershipStatusChangedAt && (
                <div>
                  <label className="text-sm font-medium text-slate-600">ステータス変更日</label>
                  <p className="text-slate-900">{formatDate(user.membershipStatusChangedAt)}</p>
                </div>
              )}
            </div>

            {(isEditing || user.membershipStatusReason) && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-slate-600">ステータス変更理由</label>
                {isEditing ? (
                  <textarea
                    value={editForm.membershipStatusReason}
                    onChange={(e) => setEditForm({ ...editForm, membershipStatusReason: e.target.value })}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="変更理由を入力（任意）"
                  />
                ) : (
                  <>
                    <p className="text-slate-900 mt-1">{user.membershipStatusReason}</p>
                    {user.membershipStatusChangedBy && (
                      <p className="text-sm text-slate-500 mt-1">変更者: {user.membershipStatusChangedBy}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 休会・退会情報 */}
        {(user.suspensionStartDate || user.canceledAt) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                休会・退会情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.suspensionStartDate && (
                <div>
                  <label className="text-sm font-medium text-slate-600">休会期間</label>
                  <p className="text-slate-900">
                    {formatDate(user.suspensionStartDate)} 〜 {user.suspensionEndDate ? formatDate(user.suspensionEndDate) : '未定'}
                  </p>
                </div>
              )}
              {user.canceledAt && (
                <div>
                  <label className="text-sm font-medium text-slate-600">退会日</label>
                  <p className="text-slate-900">{formatDate(user.canceledAt)}</p>
                  {user.cancellationReason && (
                    <p className="text-sm text-slate-600 mt-1">理由: {user.cancellationReason}</p>
                  )}
                </div>
              )}
              {user.delinquentSince && (
                <div>
                  <label className="text-sm font-medium text-slate-600">滞納開始日</label>
                  <p className="text-slate-900">{formatDate(user.delinquentSince)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* サブスクリプション情報 */}
        {user.subscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                サブスクリプション情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">ステータス</label>
                  <p className="text-slate-900">{user.subscription.status}</p>
                </div>
                {user.subscription.stripeDetails && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-600">月額料金</label>
                      <p className="text-slate-900">{formatCurrency(user.subscription.stripeDetails.amount)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">次回請求日</label>
                      <p className="text-slate-900">{formatDate(user.subscription.stripeDetails.currentPeriodEnd)}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 請求履歴 */}
        {user.invoices && user.invoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                請求履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {user.invoices.slice(0, 5).map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">
                        {formatCurrency(invoice.amount_due)} {invoice.currency.toUpperCase()}
                      </p>
                      <p className="text-sm text-slate-600">
                        {invoice.created ? formatDate(new Date(invoice.created * 1000).toISOString()) : '不明'}
                      </p>
                    </div>
                    <Badge className={
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {invoice.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
