'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, UserCheck, UserX, Mail, Calendar, CreditCard, AlertCircle, Search, Filter, ArrowUpDown, Download } from 'lucide-react'
import { getRoleLabel, getRoleBadgeVariant, formatDate, formatCurrency } from '@/lib/utils/user-helpers'
import { filterUsersBySearch, filterUsersByStatus, filterUsersByMembershipStatus, filterUsersByRole, sortUsers } from '@/lib/utils/filter-helpers'
import { getSubscriptionStatus } from '@/lib/utils/subscription-helpers'

interface SubscriptionInfo {
  id: string
  userId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: string
  currentPeriodEnd: string | null
  user: {
    id: string
    email: string
    name: string
  }
  stripeDetails: {
    status: string
    currentPeriodEnd: string
    currentPeriodStart: string
    cancelAtPeriodEnd: boolean
    canceledAt: string | null
    amount: number
    currency: string
  } | null
}

interface PendingUser {
  id: string
  email: string
  name: string
  createdAt: string
}

interface SupabaseUser {
  id: string
  email: string
  created_at: string
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  role: string
  membershipStatus?: string
  raw_user_meta_data: {
    name?: string
    [key: string]: any
  }
  subscription?: SubscriptionInfo
  hasSupabaseAuth?: boolean // Supabase認証が存在するか
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SupabaseUser[]>([])
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // フィルター機能
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'canceled' | 'past_due' | 'unpaid'>('all')
  const [membershipStatusFilter, setMembershipStatusFilter] = useState<'all' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'PAST_DUE' | 'DELINQUENT' | 'CANCELED' | 'TERMINATED' | 'EXPIRED'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'MEMBER' | 'FP' | 'MANAGER' | 'ADMIN'>('all')
  const [sortField, setSortField] = useState<'name' | 'email' | 'createdAt' | 'lastSignIn'>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // 一括メール送信機能
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: number; failed: number; total: number } | null>(null)

  // 一括会員ステータス変更機能
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newMembershipStatus, setNewMembershipStatus] = useState<string>('')
  const [statusChangeReason, setStatusChangeReason] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusUpdateResult, setStatusUpdateResult] = useState<{ success: number; failed: number; total: number } | null>(null)

  useEffect(() => {
    fetchUsers()
    fetchPendingUsers()
    fetchSubscriptions()
  }, [])

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch('/api/admin/pending-users', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('仮登録ユーザー情報の取得に失敗しました')
      }
      const data = await response.json()
      setPendingUsers(data.pendingUsers || [])
    } catch (err) {
      console.error('Pending users fetch error:', err)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('サブスクリプション情報の取得に失敗しました')
      }
      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
    } catch (err) {
      console.error('Subscription fetch error:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('ユーザー情報の取得に失敗しました')
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (!response.ok) {
        throw new Error('ステータスの更新に失敗しました')
      }

      // ユーザー一覧を再取得
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }


  /**
   * ユーザーのサブスクリプションステータスを取得
   * 根本的な解決: ヘルパー関数を使用してロジックを分離し、可読性を向上
   */
  const getUserSubscriptionStatus = (user: { id: string }) => {
    return getSubscriptionStatus(user.id, subscriptions)
  }

  /**
   * フィルターとソート機能
   * 根本的な解決: ヘルパー関数を使用してロジックを分離し、可読性を向上
   */
  const getFilteredAndSortedUsers = () => {
    // すべてのユーザーを統合
    type UserItem = {
      id: string
      name: string
      email: string
      role: string
      membershipStatus?: string
      createdAt: string
      lastSignIn: string | null
      subscription: SubscriptionInfo | null
      type: 'pending' | 'registered'
      hasSupabaseAuth?: boolean
    }

    const allUsers: UserItem[] = [
      ...pendingUsers.map(pending => ({
        id: pending.id,
        name: pending.name,
        email: pending.email,
        role: 'PENDING',
        membershipStatus: 'PENDING',
        createdAt: pending.createdAt,
        lastSignIn: null as string | null,
        subscription: null as SubscriptionInfo | null,
        type: 'pending' as const,
        hasSupabaseAuth: false, // 仮登録はSupabase認証なし
      })),
      ...users.map(user => ({
        id: user.id,
        name: user.raw_user_meta_data?.name || '名前未設定',
        email: user.email,
        role: user.role,
        membershipStatus: user.membershipStatus || 'ACTIVE',
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        subscription: (subscriptions.find(sub => sub.userId === user.id) || null) as SubscriptionInfo | null,
        type: 'registered' as const,
        hasSupabaseAuth: user.hasSupabaseAuth ?? true,
      }))
    ]

    // ヘルパー関数を使用してフィルターとソートを適用
    let filtered: UserItem[] = filterUsersBySearch(allUsers, searchTerm) as UserItem[]
    filtered = filterUsersByStatus(filtered, statusFilter) as UserItem[]
    filtered = filterUsersByMembershipStatus(filtered, membershipStatusFilter) as UserItem[]
    filtered = filterUsersByRole(filtered, roleFilter) as UserItem[]
    filtered = sortUsers(filtered, sortField, sortDirection) as UserItem[]

    return filtered
  }

  const handleSort = (field: 'name' | 'email' | 'createdAt' | 'lastSignIn') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // チェックボックス関連のハンドラー
  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUserIds(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredUsers.filter(u => u.type === 'registered').map(u => u.id))
      setSelectedUserIds(allIds)
    } else {
      setSelectedUserIds(new Set())
    }
  }

  // メール送信処理
  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert('件名と本文を入力してください')
      return
    }

    setIsSending(true)
    setSendResult(null)

    try {
      const response = await fetch('/api/admin/users/bulk-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          subject: emailSubject,
          body: emailBody,
        }),
      })

      if (!response.ok) {
        throw new Error('メール送信に失敗しました')
      }

      const result = await response.json()
      setSendResult(result)

      // 成功したら選択をクリア
      setSelectedUserIds(new Set())
      setEmailSubject('')
      setEmailBody('')
    } catch (error) {
      console.error('メール送信エラー:', error)
      alert('メール送信中にエラーが発生しました')
    } finally {
      setIsSending(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/admin/users/export', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('CSVエクスポートに失敗しました')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('CSV export error:', error)
      alert('CSVエクスポートに失敗しました')
    }
  }

  const handleBulkStatusUpdate = async () => {
    if (!newMembershipStatus) {
      alert('変更後のステータスを選択してください')
      return
    }

    if (!confirm(`選択した${selectedUserIds.size}名のユーザーの会員ステータスを「${newMembershipStatus}」に変更しますか？`)) {
      return
    }

    setIsUpdatingStatus(true)
    setStatusUpdateResult(null)

    try {
      const response = await fetch('/api/admin/users/bulk-membership-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          membershipStatus: newMembershipStatus,
          reason: statusChangeReason.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('ステータス変更に失敗しました')
      }

      const result = await response.json()
      setStatusUpdateResult({
        success: result.successCount,
        failed: result.failedCount,
        total: result.total,
      })

      // 成功したら選択をクリアしてユーザー一覧を再取得
      setSelectedUserIds(new Set())
      setNewMembershipStatus('')
      setStatusChangeReason('')
      await fetchUsers()
    } catch (error) {
      console.error('ステータス変更エラー:', error)
      alert('ステータス変更中にエラーが発生しました')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Users className="h-10 w-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto animate-ping opacity-20"></div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">ユーザー情報を読み込み中...</h2>
          <p className="text-slate-600">データを取得しています</p>
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const filteredUsers = getFilteredAndSortedUsers()

  const isAllSelected = filteredUsers.filter(u => u.type === 'registered').length > 0 &&
    filteredUsers.filter(u => u.type === 'registered').every(u => selectedUserIds.has(u.id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* ヘッダーセクション */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  ユーザー管理
                </h1>
                <p className="text-blue-100 text-lg">登録済みユーザーの一覧と管理</p>
              </div>
              <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Users className="h-6 w-6 text-blue-200" />
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {filteredUsers.length}
                  </div>
                  <div className="text-sm text-blue-200">
                    総ユーザー数
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex space-x-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="text-sm text-blue-200">正式登録</div>
                <div className="text-xl font-semibold text-white">{users.length}名</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="text-sm text-blue-200">仮登録</div>
                <div className="text-xl font-semibold text-white">{pendingUsers.length}名</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">エラーが発生しました</h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  <Button 
                    onClick={() => {
                      fetchUsers()
                      fetchPendingUsers()
                      fetchSubscriptions()
                    }} 
                    variant="outline" 
                    size="sm" 
                    className="bg-white hover:bg-red-50 border-red-300 text-red-700 hover:text-red-800"
                  >
                    再試行
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* フィルターと検索 */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center">
              <Filter className="h-5 w-5 mr-2 text-blue-600" />
              フィルター・検索
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="名前またはメールで検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:shadow-md transition-all duration-200"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <option value="all">決済ステータス: すべて</option>
                <option value="pending">仮登録</option>
                <option value="active">アクティブ</option>
                <option value="canceled">キャンセル済み</option>
                <option value="past_due">支払い遅延</option>
                <option value="unpaid">未払い</option>
              </select>

              <select
                value={membershipStatusFilter}
                onChange={(e) => setMembershipStatusFilter(e.target.value as any)}
                className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <option value="all">会員ステータス: すべて</option>
                <option value="PENDING">仮登録</option>
                <option value="ACTIVE">有効会員</option>
                <option value="SUSPENDED">休会中</option>
                <option value="PAST_DUE">支払い遅延</option>
                <option value="DELINQUENT">長期滞納</option>
                <option value="CANCELED">退会済み</option>
                <option value="TERMINATED">強制解約</option>
                <option value="EXPIRED">期限切れ</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <option value="all">ロール: すべて</option>
                <option value="PENDING">仮登録</option>
                <option value="MEMBER">メンバー</option>
                <option value="FP">FPエイド</option>
                <option value="MANAGER">マネージャー</option>
                <option value="ADMIN">管理者</option>
              </select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setMembershipStatusFilter('all')
                  setRoleFilter('all')
                }}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 border-slate-300 text-slate-700 hover:text-slate-800 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl py-3"
              >
                <Filter className="h-4 w-4" />
                <span>リセット</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-green-300 text-green-700 hover:text-green-800 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl py-3"
              >
                <Download className="h-4 w-4" />
                <span>CSV出力</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ユーザーテーブル */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                ユーザー一覧
              </h2>
              {selectedUserIds.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowStatusModal(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>ステータス変更 ({selectedUserIds.size}名)</span>
                  </Button>
                  <Button
                    onClick={() => setShowEmailModal(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Mail className="h-4 w-4" />
                    <span>一括メール送信 ({selectedUserIds.size}名)</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50">
                  <TableHead className="py-4 px-6 font-semibold text-slate-700 w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 transition-colors py-4 px-6 font-semibold text-slate-700"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>名前</span>
                      <ArrowUpDown className="h-4 w-4 text-slate-500" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors py-4 px-6 font-semibold text-slate-700"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>メール</span>
                      <ArrowUpDown className="h-4 w-4 text-slate-500" />
                    </div>
                  </TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-slate-700">ステータス</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-slate-700">決済ステータス</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors py-4 px-6 font-semibold text-slate-700"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>登録日</span>
                      <ArrowUpDown className="h-4 w-4 text-slate-500" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors py-4 px-6 font-semibold text-slate-700"
                    onClick={() => handleSort('lastSignIn')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>最終ログイン</span>
                      <ArrowUpDown className="h-4 w-4 text-slate-500" />
                    </div>
                  </TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-slate-700">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, index) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 border-b border-slate-100"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="py-4 px-6">
                      {user.type === 'registered' && (
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          {user.type === 'registered' ? (
                            <button
                              onClick={() => window.location.href = `/dashboard/admin/users/${user.id}`}
                              className="font-medium text-slate-900 hover:text-blue-600 hover:underline transition-colors text-left"
                            >
                              {user.name}
                            </button>
                          ) : (
                            <div className="font-medium text-slate-900">{user.name}</div>
                          )}
                          {user.type === 'pending' && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 mt-1">
                              <UserX className="h-3 w-3 mr-1" />
                              仮登録
                            </Badge>
                          )}
                          {user.type === 'registered' && user.hasSupabaseAuth === false && (
                            <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 mt-1">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              認証なし
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="text-slate-700">{user.email}</div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Badge 
                        variant={getRoleBadgeVariant(user.role)}
                        className="shadow-sm font-medium"
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {user.type === 'pending' ? (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm">
                          <CreditCard className="h-3 w-3 mr-1" />
                          決済待ち
                        </Badge>
                      ) : (
                        (() => {
                          const subStatus = getUserSubscriptionStatus(user)
                          return (
                            <Badge 
                              variant={subStatus.variant}
                              className={`shadow-sm font-medium ${
                                subStatus.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                                subStatus.status === 'canceled' ? 'bg-red-100 text-red-800 border-red-200' :
                                subStatus.status === 'past_due' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'
                              }`}
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              {subStatus.label}
                              {subStatus.cancelAtPeriodEnd && (
                                <AlertCircle className="h-3 w-3 ml-1" />
                              )}
                            </Badge>
                          )
                        })()
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="text-slate-600">{formatDate(user.createdAt)}</div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="text-slate-600">
                        {user.lastSignIn ? formatDate(user.lastSignIn) : '未ログイン'}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {user.type === 'registered' && (
                        <div className="flex flex-wrap gap-1">
                          {['MEMBER', 'FP', 'MANAGER', 'ADMIN'].map((role) => (
                            <Button
                              key={role}
                              variant={user.role === role ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateUserRole(user.id, role)}
                              disabled={user.role === role}
                              className={`text-xs px-3 py-1 h-auto transition-all duration-200 ${
                                user.role === role
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                                  : 'hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 border-slate-300'
                              }`}
                            >
                              {getRoleLabel(role)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {filteredUsers.length === 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                ユーザーが見つかりません
              </h3>
              <p className="text-slate-600 text-lg mb-6 max-w-md mx-auto">
                フィルター条件に一致するユーザーがいないか、まだユーザーが登録されていません。
              </p>
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setRoleFilter('all')
                  }}
                  className="bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 border-slate-300 text-slate-700 hover:text-slate-800"
                >
                  フィルターをリセット
                </Button>
                <Button
                  onClick={() => {
                    fetchUsers()
                    fetchPendingUsers()
                    fetchSubscriptions()
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                >
                  データを更新
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 一括ステータス変更モーダル */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <UserCheck className="h-5 w-5 mr-2" />
                    一括ステータス変更 ({selectedUserIds.size}名)
                  </h2>
                  <button
                    onClick={() => {
                      setShowStatusModal(false)
                      setStatusUpdateResult(null)
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {statusUpdateResult ? (
                  // 更新結果表示
                  <div className="text-center py-8">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                      statusUpdateResult.success === statusUpdateResult.total
                        ? 'bg-green-100'
                        : 'bg-yellow-100'
                    }`}>
                      {statusUpdateResult.success === statusUpdateResult.total ? (
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <AlertCircle className="w-8 h-8 text-yellow-600" />
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      更新完了
                    </h3>
                    <p className="text-slate-600 mb-6">
                      {statusUpdateResult.total}名中 {statusUpdateResult.success}名の更新に成功
                      {statusUpdateResult.failed > 0 && ` (${statusUpdateResult.failed}名失敗)`}
                    </p>
                    <Button
                      onClick={() => {
                        setShowStatusModal(false)
                        setStatusUpdateResult(null)
                      }}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    >
                      閉じる
                    </Button>
                  </div>
                ) : (
                  // ステータス変更フォーム
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        新しいステータス <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newMembershipStatus}
                        onChange={(e) => setNewMembershipStatus(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={isUpdatingStatus}
                      >
                        <option value="">選択してください</option>
                        <option value="PENDING">仮登録</option>
                        <option value="ACTIVE">有効会員</option>
                        <option value="SUSPENDED">休会中</option>
                        <option value="PAST_DUE">支払い遅延</option>
                        <option value="DELINQUENT">長期滞納</option>
                        <option value="CANCELED">退会済み</option>
                        <option value="TERMINATED">強制解約</option>
                        <option value="EXPIRED">期限切れ</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        変更理由（任意）
                      </label>
                      <textarea
                        value={statusChangeReason}
                        onChange={(e) => setStatusChangeReason(e.target.value)}
                        placeholder="ステータス変更の理由を入力してください"
                        rows={4}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        disabled={isUpdatingStatus}
                      />
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <p className="text-sm text-purple-800">
                        <strong>対象:</strong> {selectedUserIds.size}名のユーザー
                      </p>
                      <p className="text-xs text-purple-600 mt-2">
                        ⚠️ この操作は取り消せません。慎重に実行してください。
                      </p>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button
                        onClick={() => {
                          setShowStatusModal(false)
                          setStatusUpdateResult(null)
                        }}
                        variant="outline"
                        className="flex-1"
                        disabled={isUpdatingStatus}
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleBulkStatusUpdate}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        disabled={isUpdatingStatus || !newMembershipStatus}
                      >
                        {isUpdatingStatus ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            更新中...
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            変更する
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 一括メール送信モーダル */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    一括メール送信 ({selectedUserIds.size}名)
                  </h2>
                  <button
                    onClick={() => {
                      setShowEmailModal(false)
                      setSendResult(null)
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {sendResult ? (
                  // 送信結果表示
                  <div className="text-center py-8">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                      sendResult.success === sendResult.total
                        ? 'bg-green-100'
                        : 'bg-yellow-100'
                    }`}>
                      {sendResult.success === sendResult.total ? (
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <AlertCircle className="w-8 h-8 text-yellow-600" />
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      送信完了
                    </h3>
                    <p className="text-slate-600 mb-6">
                      {sendResult.total}名中 {sendResult.success}名に送信成功
                      {sendResult.failed > 0 && ` (${sendResult.failed}名失敗)`}
                    </p>
                    <Button
                      onClick={() => {
                        setShowEmailModal(false)
                        setSendResult(null)
                      }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                      閉じる
                    </Button>
                  </div>
                ) : (
                  // メール作成フォーム
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        件名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="例: 【重要】お支払いについてのお知らせ"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isSending}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        本文 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="メール本文を入力してください"
                        rows={10}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        disabled={isSending}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const cursorPos = document.querySelector('textarea')?.selectionStart || emailBody.length
                            const newBody = emailBody.slice(0, cursorPos) + '{{payment_link}}' + emailBody.slice(cursorPos)
                            setEmailBody(newBody)
                          }}
                          disabled={isSending}
                          className="text-xs"
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          決済リンク挿入
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const cursorPos = document.querySelector('textarea')?.selectionStart || emailBody.length
                            const newBody = emailBody.slice(0, cursorPos) + '{{name}}' + emailBody.slice(cursorPos)
                            setEmailBody(newBody)
                          }}
                          disabled={isSending}
                          className="text-xs"
                        >
                          名前挿入
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        💡 <strong>{'{{payment_link}}'}</strong> を入力すると、各ユーザー専用の決済リンクに自動変換されます
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-blue-800">
                        <strong>送信先:</strong> {selectedUserIds.size}名のユーザー
                      </p>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button
                        onClick={() => {
                          setShowEmailModal(false)
                          setSendResult(null)
                        }}
                        variant="outline"
                        className="flex-1"
                        disabled={isSending}
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleSendEmail}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        disabled={isSending || !emailSubject.trim() || !emailBody.trim()}
                      >
                        {isSending ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            送信中...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            送信する
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}