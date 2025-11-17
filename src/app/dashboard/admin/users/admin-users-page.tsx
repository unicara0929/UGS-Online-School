'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, UserCheck, UserX, Mail, Calendar, CreditCard, AlertCircle, Search, Filter, ArrowUpDown } from 'lucide-react'
import { getRoleLabel, getRoleBadgeVariant, formatDate, formatCurrency } from '@/lib/utils/user-helpers'
import { filterUsersBySearch, filterUsersByStatus, filterUsersByRole, sortUsers } from '@/lib/utils/filter-helpers'
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
  const [roleFilter, setRoleFilter] = useState<'all' | 'MEMBER' | 'FP' | 'MANAGER' | 'ADMIN'>('all')
  const [sortField, setSortField] = useState<'name' | 'email' | 'createdAt' | 'lastSignIn'>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

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
                <option value="all">すべてのステータス</option>
                <option value="pending">仮登録</option>
                <option value="active">アクティブ</option>
                <option value="canceled">キャンセル済み</option>
                <option value="past_due">支払い遅延</option>
                <option value="unpaid">未払い</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <option value="all">すべてのステータス</option>
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
                  setRoleFilter('all')
                }}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 border-slate-300 text-slate-700 hover:text-slate-800 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl py-3"
              >
                <Filter className="h-4 w-4" />
                <span>リセット</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ユーザーテーブル */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              ユーザー一覧
            </h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50">
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
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{user.name}</div>
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
      </div>
    </div>
  )
}