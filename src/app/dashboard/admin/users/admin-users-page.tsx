'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, UserCheck, UserX, Mail, Calendar, CreditCard, AlertCircle, Search, Filter, ArrowUpDown, Download, FileCheck, FileX, UserPlus, Eye, EyeOff, Trash2, Upload, CheckCircle, XCircle } from 'lucide-react'
import { getRoleLabel, getRoleBadgeVariant, formatDate, formatCurrency } from '@/lib/utils/user-helpers'
import { filterUsersBySearch, filterUsersByStatus, filterUsersByMembershipStatus, filterUsersByRole, sortUsers } from '@/lib/utils/filter-helpers'
import { getSubscriptionStatus } from '@/lib/utils/subscription-helpers'

// =====================================
// 定数
// =====================================

/** 利用可能なユーザーロール */
const USER_ROLES = ['MEMBER', 'FP', 'MANAGER', 'ADMIN'] as const

/** 会員ステータスのオプション */
const MEMBERSHIP_STATUS_OPTIONS = [
  { value: 'PENDING', label: '仮登録' },
  { value: 'ACTIVE', label: '有効会員' },
  { value: 'PAST_DUE', label: '支払い遅延' },
  { value: 'DELINQUENT', label: '長期滞納' },
  { value: 'CANCELLATION_PENDING', label: '退会予定' },
  { value: 'CANCELED', label: '退会済み' },
  { value: 'TERMINATED', label: '強制解約' },
  { value: 'EXPIRED', label: '期限切れ' },
] as const

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
  emailVerified?: boolean
  tokenExpiresAt?: string
  createdAt: string
}

interface ManagerInfo {
  id: string
  name: string
  email: string
}

interface SupabaseUser {
  id: string
  email: string
  created_at: string
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  role: string
  membershipStatus?: string
  memberId?: string | null
  contractCompleted?: boolean // 業務委託契約書完了
  managerId?: string | null // 担当マネージャーID
  managerName?: string | null // 担当マネージャー名
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
  const [managers, setManagers] = useState<ManagerInfo[]>([]) // マネージャー一覧
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ユーザー統計情報
  const [stats, setStats] = useState<{
    fpCount: number
    memberCount: number
    memberToFpPromotions: number
  } | null>(null)

  // フィルター機能
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'canceled' | 'past_due' | 'unpaid'>('all')
  const [membershipStatusFilter, setMembershipStatusFilter] = useState<'all' | 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'DELINQUENT' | 'CANCELLATION_PENDING' | 'CANCELED' | 'TERMINATED' | 'EXPIRED'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'MEMBER' | 'FP' | 'MANAGER' | 'ADMIN'>('all')
  const [contractFilter, setContractFilter] = useState<'all' | 'completed' | 'incomplete'>('all')
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

  // 一括ロール変更機能
  const [showBulkRoleChangeModal, setShowBulkRoleChangeModal] = useState(false)
  const [isChangingRole, setIsChangingRole] = useState(false)
  const [bulkRoleChangeResult, setBulkRoleChangeResult] = useState<{ success: boolean; message: string; count: number } | null>(null)

  // 仮登録ユーザー操作モーダル
  const [showPendingUserModal, setShowPendingUserModal] = useState(false)
  const [selectedPendingUser, setSelectedPendingUser] = useState<PendingUser | null>(null)
  const [pendingUserAction, setPendingUserAction] = useState<'verify' | 'resend' | 'delete' | null>(null)
  const [isPendingUserActionLoading, setIsPendingUserActionLoading] = useState(false)

  // ユーザー作成モーダル
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'MEMBER',
  })
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 仮登録ユーザー一括選択・削除
  const [selectedPendingUserIds, setSelectedPendingUserIds] = useState<Set<string>>(new Set())
  const [isDeletingPendingUsers, setIsDeletingPendingUsers] = useState(false)

  // 本登録ユーザー削除
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null)

  // ユーザー一括作成モーダル
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false)
  const [bulkCreateData, setBulkCreateData] = useState('')
  const [isBulkCreating, setIsBulkCreating] = useState(false)
  const [bulkCreateResult, setBulkCreateResult] = useState<{
    summary: { total: number; success: number; failed: number }
    results: { email: string; success: boolean; memberId?: string; error?: string }[]
  } | null>(null)

  useEffect(() => {
    fetchUsers()
    fetchPendingUsers()
    fetchSubscriptions()
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/users/stats', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('統計情報の取得に失敗しました')
      }
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Stats fetch error:', err)
    }
  }

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
      setManagers(data.managers || []) // マネージャー一覧も設定
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    // 対象ユーザーを取得
    const targetUser = users.find(u => u.id === userId)
    const currentRole = targetUser?.role || ''
    const userName = targetUser?.raw_user_meta_data?.name || targetUser?.email || 'このユーザー'

    // 降格かどうかを判定（FP/MANAGER/ADMIN → MEMBER）
    const isDemotion = newRole === 'MEMBER' &&
      (currentRole === 'FP' || currentRole === 'MANAGER' || currentRole === 'ADMIN')

    // 確認メッセージを作成
    let confirmMessage = `${userName} のロールを「${getRoleLabel(currentRole)}」から「${getRoleLabel(newRole)}」に変更しますか？`

    if (isDemotion) {
      confirmMessage += '\n\n⚠️ 降格の場合、以下のデータがリセットされます：\n・LP面談データ\n・事前アンケート回答\n・昇格申請データ'
    }

    // 確認ダイアログを表示
    if (!window.confirm(confirmMessage)) {
      return
    }

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
   * 契約ステータスを更新
   */
  const updateContractStatus = async (userId: string, contractCompleted: boolean) => {
    const targetUser = users.find(u => u.id === userId)
    const userName = targetUser?.raw_user_meta_data?.name || targetUser?.email || 'このユーザー'
    const newStatus = contractCompleted ? '完了' : '未完了'

    if (!window.confirm(`${userName} の業務委託契約書を「${newStatus}」に変更しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/contract`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ contractCompleted }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '契約ステータスの更新に失敗しました')
      }

      // ユーザー一覧を再取得
      await fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : '契約ステータスの更新に失敗しました')
    }
  }

  /**
   * 担当マネージャーを更新
   */
  const updateUserManager = async (userId: string, managerId: string | null) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/manager`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ managerId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '担当マネージャーの更新に失敗しました')
      }

      // ユーザー一覧を再取得
      await fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : '担当マネージャーの更新に失敗しました')
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
      memberId?: string
      contractCompleted?: boolean
      managerId?: string | null
      managerName?: string | null
      createdAt: string
      lastSignIn: string | null
      subscription: SubscriptionInfo | null
      type: 'pending' | 'registered'
      hasSupabaseAuth?: boolean
      emailVerified?: boolean
      tokenExpiresAt?: string
    }

    const allUsers: UserItem[] = [
      ...pendingUsers.map(pending => ({
        id: pending.id,
        name: pending.name,
        email: pending.email,
        role: 'PENDING',
        membershipStatus: 'PENDING',
        memberId: undefined as string | undefined,
        contractCompleted: false,
        managerId: null as string | null,
        managerName: null as string | null,
        createdAt: pending.createdAt,
        lastSignIn: null as string | null,
        subscription: null as SubscriptionInfo | null,
        type: 'pending' as const,
        hasSupabaseAuth: false, // 仮登録はSupabase認証なし
        emailVerified: pending.emailVerified,
        tokenExpiresAt: pending.tokenExpiresAt,
      })),
      ...users.map(user => ({
        id: user.id,
        name: user.raw_user_meta_data?.name || '名前未設定',
        email: user.email,
        role: user.role,
        membershipStatus: user.membershipStatus || 'ACTIVE',
        memberId: user.memberId || undefined,
        contractCompleted: user.contractCompleted || false,
        managerId: user.managerId || null,
        managerName: user.managerName || null,
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

    // 契約状況フィルター
    if (contractFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (user.type === 'pending') return false // 仮登録ユーザーは契約なし
        if (contractFilter === 'completed') return user.contractCompleted === true
        if (contractFilter === 'incomplete') return user.contractCompleted !== true
        return true
      })
    }

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

  // 仮登録ユーザーの選択ハンドラー
  const handleSelectPendingUser = (userId: string) => {
    const newSelected = new Set(selectedPendingUserIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedPendingUserIds(newSelected)
  }

  const handleSelectAllPendingUsers = (checked: boolean) => {
    if (checked) {
      const allPendingIds = new Set(filteredUsers.filter(u => u.type === 'pending').map(u => u.id))
      setSelectedPendingUserIds(allPendingIds)
    } else {
      setSelectedPendingUserIds(new Set())
    }
  }

  // 仮登録ユーザー一括削除
  const handleBulkDeletePendingUsers = async () => {
    if (selectedPendingUserIds.size === 0) return

    const confirmMessage = `選択した${selectedPendingUserIds.size}件の仮登録ユーザーを削除しますか？\n\nこの操作は取り消せません。削除後、同じメールアドレスで新規登録できるようになります。`
    if (!window.confirm(confirmMessage)) return

    setIsDeletingPendingUsers(true)

    try {
      let successCount = 0
      let failedCount = 0

      for (const pendingUserId of selectedPendingUserIds) {
        try {
          const response = await fetch(`/api/admin/pending-users/${pendingUserId}`, {
            method: 'DELETE',
            credentials: 'include',
          })

          if (response.ok) {
            successCount++
          } else {
            failedCount++
          }
        } catch (err) {
          failedCount++
        }
      }

      alert(`削除完了\n成功: ${successCount}件\n失敗: ${failedCount}件`)

      // 選択をクリアしてデータを再取得
      setSelectedPendingUserIds(new Set())
      await fetchPendingUsers()
    } catch (err) {
      alert('削除処理中にエラーが発生しました')
    } finally {
      setIsDeletingPendingUsers(false)
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

  /**
   * 仮登録ユーザーの操作を実行
   */
  const handlePendingUserAction = async (action: 'verify' | 'resend' | 'delete') => {
    if (!selectedPendingUser) return

    setIsPendingUserActionLoading(true)
    setPendingUserAction(action)

    try {
      let response: Response

      if (action === 'delete') {
        response = await fetch(`/api/admin/pending-users/${selectedPendingUser.id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      } else {
        response = await fetch(`/api/admin/pending-users/${selectedPendingUser.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ action }),
        })
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '操作に失敗しました')
      }

      // 成功メッセージ
      if (action === 'verify') {
        alert('メール認証を完了しました')
      } else if (action === 'resend') {
        alert('認証メールを再送信しました')
      } else if (action === 'delete') {
        alert('仮登録ユーザーを削除しました')
      }

      // モーダルを閉じてデータを再取得
      setShowPendingUserModal(false)
      setSelectedPendingUser(null)
      await fetchPendingUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作に失敗しました')
    } finally {
      setIsPendingUserActionLoading(false)
      setPendingUserAction(null)
    }
  }

  /**
   * ユーザーを直接作成
   */
  const handleCreateUser = async () => {
    if (!createUserForm.email || !createUserForm.password || !createUserForm.name) {
      alert('メールアドレス、パスワード、名前を入力してください')
      return
    }

    if (createUserForm.password.length < 6) {
      alert('パスワードは6文字以上で設定してください')
      return
    }

    setIsCreatingUser(true)

    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(createUserForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'ユーザーの作成に失敗しました')
      }

      alert(`ユーザーを作成しました！\n\n会員番号: ${data.user.memberId}\nメール: ${data.user.email}\nロール: ${getRoleLabel(data.user.role)}\n\nメールアドレスとパスワードを本人に共有してください。`)

      // フォームをリセットしてモーダルを閉じる
      setCreateUserForm({ email: '', password: '', name: '', role: 'MEMBER' })
      setShowCreateUserModal(false)
      setShowPassword(false)

      // ユーザー一覧を再取得
      await fetchUsers()
      await fetchStats()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ユーザーの作成に失敗しました')
    } finally {
      setIsCreatingUser(false)
    }
  }

  /**
   * 本登録ユーザーを削除
   */
  const handleDeleteUser = async (userId: string, userName: string, userRole: string) => {
    // 管理者ユーザーは削除できない
    if (userRole === 'ADMIN') {
      alert('管理者ユーザーは削除できません')
      return
    }

    const confirmMessage = `「${userName}」を削除しますか？\n\nこの操作は取り消せません。ユーザーに関連するすべてのデータ（イベント参加、学習進捗、紹介情報など）も削除されます。`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setIsDeletingUser(userId)

    try {
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'ユーザーの削除に失敗しました')
      }

      alert(data.message || 'ユーザーを削除しました')

      // ユーザー一覧を再取得
      await fetchUsers()
      await fetchStats()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ユーザーの削除に失敗しました')
    } finally {
      setIsDeletingUser(null)
    }
  }

  /**
   * ユーザーを一括作成
   */
  const handleBulkCreateUsers = async () => {
    if (!bulkCreateData.trim()) {
      alert('CSVデータを入力してください')
      return
    }

    setIsBulkCreating(true)
    setBulkCreateResult(null)

    try {
      // CSVをパース（形式: メールアドレス,パスワード,名前,ロール）
      const lines = bulkCreateData.trim().split('\n')
      const users = lines.map(line => {
        const parts = line.split(',').map(s => s.trim())
        return {
          email: parts[0] || '',
          password: parts[1] || '',
          name: parts[2] || '',
          role: parts[3]?.toUpperCase() || 'MEMBER',
        }
      }).filter(u => u.email) // 空行を除外

      if (users.length === 0) {
        alert('有効なユーザーデータがありません')
        setIsBulkCreating(false)
        return
      }

      const response = await fetch('/api/admin/users/bulk-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ users }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'ユーザーの一括作成に失敗しました')
      }

      setBulkCreateResult(data)

      // 成功した場合はユーザー一覧を再取得
      if (data.summary.success > 0) {
        await fetchUsers()
        await fetchStats()
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ユーザーの一括作成に失敗しました')
    } finally {
      setIsBulkCreating(false)
    }
  }

  /**
   * 仮登録ユーザーをクリックしたときの処理
   */
  const handlePendingUserClick = (pendingUser: PendingUser) => {
    setSelectedPendingUser(pendingUser)
    setShowPendingUserModal(true)
  }

  const handleExportCSV = async () => {
    try {
      // 現在のフィルター条件をクエリパラメータとして渡す
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (membershipStatusFilter !== 'all') params.set('membershipStatus', membershipStatusFilter)
      if (roleFilter !== 'all') params.set('role', roleFilter)

      const queryString = params.toString()
      const url = `/api/admin/users/export${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('CSVエクスポートに失敗しました')
      }
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(blobUrl)
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

  /**
   * 一括ロール変更（MEMBER → FP）
   */
  const handleBulkRoleChange = async () => {
    const memberCount = users.filter(u => u.role === 'MEMBER').length

    if (memberCount === 0) {
      alert('変更対象のMEMBERユーザーがいません')
      return
    }

    if (!confirm(`現在のMEMBERユーザー ${memberCount}名 を全員FPエイドに昇格しますか？\n\n※オンボーディングは完了済みとして設定されます`)) {
      return
    }

    setIsChangingRole(true)
    setBulkRoleChangeResult(null)

    try {
      const response = await fetch('/api/admin/users/role/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fromRole: 'MEMBER',
          toRole: 'FP',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '一括ロール変更に失敗しました')
      }

      setBulkRoleChangeResult({
        success: true,
        message: result.message,
        count: result.updatedCount,
      })

      // ユーザー一覧と統計を再取得
      await fetchUsers()
      await fetchStats()
    } catch (error) {
      console.error('一括ロール変更エラー:', error)
      setBulkRoleChangeResult({
        success: false,
        message: error instanceof Error ? error.message : '一括ロール変更に失敗しました',
        count: 0,
      })
    } finally {
      setIsChangingRole(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Users className="h-10 w-10 text-white animate-pulse" aria-hidden="true" />
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

  const isAllPendingSelected = filteredUsers.filter(u => u.type === 'pending').length > 0 &&
    filteredUsers.filter(u => u.type === 'pending').every(u => selectedPendingUserIds.has(u.id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-8">
        {/* ヘッダーセクション */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-4 sm:p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  ユーザー管理
                </h1>
                <p className="text-blue-100 text-sm sm:text-lg">登録済みユーザーの一覧と管理</p>
              </div>
              <div className="flex items-center space-x-3 sm:space-x-4 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 self-start sm:self-auto">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-200" aria-hidden="true" />
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {filteredUsers.length}
                  </div>
                  <div className="text-xs sm:text-sm text-blue-200">
                    総ユーザー数
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 flex items-center justify-between">
              <div className="flex space-x-3 sm:space-x-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                  <div className="text-xs sm:text-sm text-blue-200">正式登録</div>
                  <div className="text-lg sm:text-xl font-semibold text-white">{users.length}名</div>
                </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                <div className="text-xs sm:text-sm text-blue-200">仮登録</div>
                <div className="text-lg sm:text-xl font-semibold text-white">{pendingUsers.length}名</div>
              </div>
              </div>
              {/* ユーザー作成ボタン */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowBulkCreateModal(true)}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                  一括作成
                </Button>
                <Button
                  onClick={() => setShowCreateUserModal(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 shadow-lg"
                >
                  <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                  ユーザー作成
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ユーザー統計サマリー */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            {/* FPエイド数 */}
            <Card className="border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 sm:p-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                  <span className="text-blue-900">FPエイド</span>
                  <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" aria-hidden="true" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-4 sm:pt-6">
                <div className="text-2xl sm:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">
                  {stats.fpCount}
                  <span className="text-sm sm:text-lg text-slate-500 ml-1 sm:ml-2">名</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">現在のFPエイド数</p>
              </CardContent>
            </Card>

            {/* UGS会員数 */}
            <Card className="border-green-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 sm:p-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                  <span className="text-green-900">UGS会員</span>
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" aria-hidden="true" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-4 sm:pt-6">
                <div className="text-2xl sm:text-4xl font-bold text-green-600 mb-1 sm:mb-2">
                  {stats.memberCount}
                  <span className="text-sm sm:text-lg text-slate-500 ml-1 sm:ml-2">名</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mb-3">現在のUGS会員数</p>
                {stats.memberCount > 0 && (
                  <Button
                    onClick={() => setShowBulkRoleChangeModal(true)}
                    size="sm"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <UserCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                    全員FPに昇格
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* UGS会員→FPエイド昇格数 */}
            <Card className="border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                  <span className="text-purple-900">昇格実績</span>
                  <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" aria-hidden="true" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-4 sm:pt-6">
                <div className="text-2xl sm:text-4xl font-bold text-purple-600 mb-1 sm:mb-2">
                  {stats.memberToFpPromotions}
                  <span className="text-sm sm:text-lg text-slate-500 ml-1 sm:ml-2">名</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">UGS会員→FPエイド累計</p>
              </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
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
                      fetchStats()
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
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" aria-hidden="true" />
              フィルター・検索
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="名前またはメールで検索…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-200"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-200"
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
                className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-200"
              >
                <option value="all">会員ステータス: すべて</option>
                {MEMBERSHIP_STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-200"
              >
                <option value="all">ロール: すべて</option>
                <option value="PENDING">仮登録</option>
                <option value="MEMBER">メンバー</option>
                <option value="FP">FPエイド</option>
                <option value="MANAGER">マネージャー</option>
                <option value="ADMIN">管理者</option>
              </select>

              <select
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value as any)}
                className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-200"
              >
                <option value="all">契約書: すべて</option>
                <option value="completed">完了</option>
                <option value="incomplete">未完了</option>
              </select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setMembershipStatusFilter('all')
                  setRoleFilter('all')
                  setContractFilter('all')
                }}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 border-slate-300 text-slate-700 hover:text-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl py-2.5 sm:py-3 text-sm"
              >
                <Filter className="h-4 w-4" aria-hidden="true" />
                <span>リセット</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-green-300 text-green-700 hover:text-green-800 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl py-2.5 sm:py-3 text-sm"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>CSV出力</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ユーザーテーブル */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" aria-hidden="true" />
                ユーザー一覧
              </h2>
              {(selectedUserIds.size > 0 || selectedPendingUserIds.size > 0) && (
                <div className="flex flex-wrap gap-2">
                  {selectedUserIds.size > 0 && (
                    <>
                      <Button
                        onClick={() => setShowStatusModal(true)}
                        size="sm"
                        className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-shadow duration-200 text-xs sm:text-sm"
                      >
                        <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">ステータス変更</span>
                        <span className="sm:hidden">変更</span>
                        <span>({selectedUserIds.size})</span>
                      </Button>
                      <Button
                        onClick={() => setShowEmailModal(true)}
                        size="sm"
                        className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-shadow duration-200 text-xs sm:text-sm"
                      >
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">一括メール送信</span>
                        <span className="sm:hidden">メール</span>
                        <span>({selectedUserIds.size})</span>
                      </Button>
                    </>
                  )}
                  {selectedPendingUserIds.size > 0 && (
                    <Button
                      onClick={handleBulkDeletePendingUsers}
                      disabled={isDeletingPendingUsers}
                      size="sm"
                      className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-shadow duration-200 text-xs sm:text-sm"
                    >
                      {isDeletingPendingUsers ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>削除中...</span>
                        </>
                      ) : (
                        <>
                          <UserX className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">仮登録を一括削除</span>
                          <span className="sm:hidden">削除</span>
                          <span>({selectedPendingUserIds.size})</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50">
                  <TableHead className="py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 w-10 sm:w-12">
                    <div className="flex flex-col gap-1">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                        title="登録済みユーザーを全選択"
                      />
                      {filteredUsers.some(u => u.type === 'pending') && (
                        <input
                          type="checkbox"
                          checked={isAllPendingSelected}
                          onChange={(e) => handleSelectAllPendingUsers(e.target.checked)}
                          className="w-4 h-4 text-orange-600 bg-white border-orange-300 rounded focus:ring-orange-500 cursor-pointer"
                          title="仮登録ユーザーを全選択"
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-xs sm:text-sm">会員番号</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 transition-colors py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-xs sm:text-sm"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span>名前</span>
                      <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" aria-hidden="true" />
                    </div>
                  </TableHead>
                  <TableHead className="py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-xs sm:text-sm">ステータス</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 transition-colors py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-xs sm:text-sm"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span>メール</span>
                      <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" aria-hidden="true" />
                    </div>
                  </TableHead>
                  <TableHead className="py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-xs sm:text-sm">決済</TableHead>
                  <TableHead className="py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-xs sm:text-sm">契約</TableHead>
                  <TableHead className="py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-xs sm:text-sm">担当MGR</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 transition-colors py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-xs sm:text-sm"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span>登録日</span>
                      <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" aria-hidden="true" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 transition-colors py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-xs sm:text-sm"
                    onClick={() => handleSort('lastSignIn')}
                  >
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span>最終ログイン</span>
                      <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" aria-hidden="true" />
                    </div>
                  </TableHead>
                  <TableHead className="py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-700 text-xs sm:text-sm">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, index) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-colors duration-200 border-b border-slate-100"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* 1. チェックボックス */}
                    <TableCell className="py-3 sm:py-4 px-3 sm:px-6">
                      {user.type === 'registered' ? (
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={selectedPendingUserIds.has(user.id)}
                          onChange={() => handleSelectPendingUser(user.id)}
                          className="w-4 h-4 text-orange-600 bg-white border-orange-300 rounded focus:ring-orange-500 cursor-pointer"
                        />
                      )}
                    </TableCell>
                    {/* 2. 会員番号 */}
                    <TableCell className="py-3 sm:py-4 px-3 sm:px-6">
                      {user.memberId ? (
                        <div className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                          {user.memberId}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">未付与</span>
                      )}
                    </TableCell>
                    {/* 3. 名前 */}
                    <TableCell className="py-3 sm:py-4 px-3 sm:px-6">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-lg flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {user.type === 'registered' ? (
                            <button
                              onClick={() => window.location.href = `/dashboard/admin/users/${user.id}`}
                              className="font-medium text-slate-900 hover:text-blue-600 hover:underline transition-colors text-left text-xs sm:text-sm truncate block max-w-[120px] sm:max-w-none"
                            >
                              {user.name}
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePendingUserClick({
                                id: user.id,
                                email: user.email,
                                name: user.name,
                                emailVerified: user.emailVerified,
                                tokenExpiresAt: user.tokenExpiresAt,
                                createdAt: user.createdAt,
                              })}
                              className="font-medium text-slate-900 hover:text-orange-600 hover:underline transition-colors text-left text-xs sm:text-sm truncate block max-w-[120px] sm:max-w-none"
                            >
                              {user.name}
                            </button>
                          )}
                          {user.type === 'pending' && (
                            <Badge variant="outline" className={`mt-1 text-xs ${
                              user.emailVerified
                                ? 'text-green-600 border-green-300 bg-green-50'
                                : 'text-orange-600 border-orange-300 bg-orange-50'
                            }`}>
                              <UserX className="h-3 w-3 mr-1" aria-hidden="true" />
                              {user.emailVerified ? '認証済み' : '仮登録'}
                            </Badge>
                          )}
                          {user.type === 'registered' && user.hasSupabaseAuth === false && (
                            <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 mt-1 text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                              認証なし
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {/* 4. ステータス（ロール） */}
                    <TableCell className="py-3 sm:py-4 px-3 sm:px-6">
                      {user.type === 'registered' ? (
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          className={`text-xs sm:text-sm px-2 py-1 border-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-[border-color,box-shadow] cursor-pointer ${
                            user.role === 'MEMBER' ? 'bg-slate-100 border-slate-300 text-slate-700 focus:ring-slate-400' :
                            user.role === 'FP' ? 'bg-blue-100 border-blue-300 text-blue-700 focus:ring-blue-400' :
                            user.role === 'MANAGER' ? 'bg-purple-100 border-purple-300 text-purple-700 focus:ring-purple-400' :
                            user.role === 'ADMIN' ? 'bg-red-100 border-red-300 text-red-700 focus:ring-red-400' :
                            'bg-white border-slate-300 text-slate-700 focus:ring-blue-400'
                          }`}
                        >
                          {USER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {getRoleLabel(role)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs">
                          仮登録
                        </Badge>
                      )}
                    </TableCell>
                    {/* 5. メール */}
                    <TableCell className="py-3 sm:py-4 px-3 sm:px-6">
                      <div className="text-slate-700 text-xs sm:text-sm truncate max-w-[150px]">{user.email}</div>
                    </TableCell>
                    {/* 6. 決済 */}
                    <TableCell className="py-3 sm:py-4 px-3 sm:px-6">
                      {user.type === 'pending' ? (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm text-xs">
                          <CreditCard className="h-3 w-3 mr-1" aria-hidden="true" />
                          待ち
                        </Badge>
                      ) : (
                        (() => {
                          const subStatus = getUserSubscriptionStatus(user)
                          return (
                            <Badge
                              variant={subStatus.variant}
                              className={`shadow-sm font-medium text-xs ${
                                subStatus.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                                subStatus.status === 'canceled' ? 'bg-red-100 text-red-800 border-red-200' :
                                subStatus.status === 'past_due' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'
                              }`}
                            >
                              <CreditCard className="h-3 w-3 mr-1" aria-hidden="true" />
                              {subStatus.label}
                              {subStatus.cancelAtPeriodEnd && (
                                <AlertCircle className="h-3 w-3 ml-1" aria-hidden="true" />
                              )}
                            </Badge>
                          )
                        })()
                      )}
                    </TableCell>
                    {/* 7. 契約 */}
                    <TableCell className="py-3 sm:py-4 px-3 sm:px-6">
                      {user.type === 'pending' ? (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 border-gray-200 shadow-sm text-xs">
                          <FileX className="h-3 w-3 mr-1" aria-hidden="true" />
                          -
                        </Badge>
                      ) : user.contractCompleted ? (
                        <button
                          onClick={() => updateContractStatus(user.id, false)}
                          className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 border border-green-200 shadow-sm text-xs hover:bg-green-200 transition-colors cursor-pointer"
                          title="クリックで未完了に変更"
                        >
                          <FileCheck className="h-3 w-3 mr-1" aria-hidden="true" />
                          完了
                        </button>
                      ) : (
                        <button
                          onClick={() => updateContractStatus(user.id, true)}
                          className="inline-flex items-center px-2 py-1 rounded-md bg-orange-100 text-orange-800 border border-orange-200 shadow-sm text-xs hover:bg-orange-200 transition-colors cursor-pointer"
                          title="クリックで完了に変更"
                        >
                          <FileX className="h-3 w-3 mr-1" aria-hidden="true" />
                          未完了
                        </button>
                      )}
                    </TableCell>
                    {/* 8. 担当MGR */}
                    <TableCell className="py-3 sm:py-4 px-3 sm:px-6">
                      {user.type === 'pending' ? (
                        <span className="text-slate-400 text-xs">-</span>
                      ) : user.role === 'FP' ? (
                        <select
                          value={user.managerId || ''}
                          onChange={(e) => updateUserManager(user.id, e.target.value || null)}
                          className="text-xs px-2 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 transition-[box-shadow,border-color] cursor-pointer min-w-[100px]"
                        >
                          <option value="">未設定</option>
                          {managers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                    {/* 9. 登録日 */}
                    <TableCell className="py-3 sm:py-4 px-3 sm:px-6">
                      <div className="text-slate-600 text-xs sm:text-sm whitespace-nowrap">{formatDate(user.createdAt)}</div>
                    </TableCell>
                    {/* 10. 最終ログイン */}
                    <TableCell className="py-3 sm:py-4 px-3 sm:px-6">
                      <div className="text-slate-600 text-xs sm:text-sm whitespace-nowrap">
                        {user.lastSignIn ? formatDate(user.lastSignIn) : '未ログイン'}
                      </div>
                    </TableCell>
                    {/* 11. 操作 */}
                    <TableCell className="py-3 sm:py-4 px-3 sm:px-6">
                      {user.type === 'registered' && user.role !== 'ADMIN' ? (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name || user.email, user.role)}
                          disabled={isDeletingUser === user.id}
                          className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-600 border border-red-200 text-xs hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="ユーザーを削除"
                        >
                          <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
                          {isDeletingUser === user.id ? '削除中...' : '削除'}
                        </button>
                      ) : user.type === 'pending' ? (
                        <button
                          onClick={() => handlePendingUserClick(user as unknown as PendingUser)}
                          className="inline-flex items-center px-2 py-1 rounded-md bg-orange-50 text-orange-600 border border-orange-200 text-xs hover:bg-orange-100 transition-colors"
                        >
                          操作
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
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
                <Users className="h-10 w-10 text-slate-400" aria-hidden="true" />
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
                    <UserCheck className="h-5 w-5 mr-2" aria-hidden="true" />
                    一括ステータス変更 ({selectedUserIds.size}名)
                  </h2>
                  <button
                    onClick={() => {
                      setShowStatusModal(false)
                      setStatusUpdateResult(null)
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
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
                        <AlertCircle className="w-8 h-8 text-yellow-600" aria-hidden="true" />
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
                        {MEMBERSHIP_STATUS_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
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
                            <UserCheck className="h-4 w-4 mr-2" aria-hidden="true" />
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

        {/* 一括ロール変更モーダル（MEMBER → FP） */}
        {showBulkRoleChangeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <UserCheck className="h-5 w-5 mr-2" aria-hidden="true" />
                    一括ロール変更
                  </h2>
                  <button
                    onClick={() => {
                      setShowBulkRoleChangeModal(false)
                      setBulkRoleChangeResult(null)
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {bulkRoleChangeResult ? (
                  // 結果表示
                  <div className="text-center py-6">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                      bulkRoleChangeResult.success ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {bulkRoleChangeResult.success ? (
                        <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
                      ) : (
                        <XCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {bulkRoleChangeResult.success ? '変更完了' : 'エラー'}
                    </h3>
                    <p className="text-slate-600 mb-6">
                      {bulkRoleChangeResult.message}
                    </p>
                    <Button
                      onClick={() => {
                        setShowBulkRoleChangeModal(false)
                        setBulkRoleChangeResult(null)
                      }}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                      閉じる
                    </Button>
                  </div>
                ) : (
                  // 確認画面
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" aria-hidden="true" />
                        <div>
                          <h4 className="font-semibold text-amber-800 mb-1">確認</h4>
                          <p className="text-sm text-amber-700">
                            現在のMEMBERユーザー <strong>{stats?.memberCount || 0}名</strong> を全員FPエイドに昇格します。
                          </p>
                          <ul className="text-sm text-amber-700 mt-2 list-disc list-inside">
                            <li>オンボーディングは完了済みとして設定されます</li>
                            <li>コンプラテストは合格済みとして設定されます</li>
                            <li>昇格メールは送信されません</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => setShowBulkRoleChangeModal(false)}
                        variant="outline"
                        className="flex-1"
                        disabled={isChangingRole}
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={() => {
                          setShowBulkRoleChangeModal(false)
                          handleBulkRoleChange()
                        }}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                        disabled={isChangingRole}
                      >
                        {isChangingRole ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            処理中...
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                            実行する
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
                    <Mail className="h-5 w-5 mr-2" aria-hidden="true" />
                    一括メール送信 ({selectedUserIds.size}名)
                  </h2>
                  <button
                    onClick={() => {
                      setShowEmailModal(false)
                      setSendResult(null)
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
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
                        <AlertCircle className="w-8 h-8 text-yellow-600" aria-hidden="true" />
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
                          <CreditCard className="h-3 w-3 mr-1" aria-hidden="true" />
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
                            <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
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

        {/* 仮登録ユーザー操作モーダル */}
        {showPendingUserModal && selectedPendingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <UserX className="h-5 w-5 mr-2" aria-hidden="true" />
                    仮登録ユーザー詳細
                  </h2>
                  <button
                    onClick={() => {
                      setShowPendingUserModal(false)
                      setSelectedPendingUser(null)
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* ユーザー情報 */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div>
                    <span className="text-sm text-slate-500">名前</span>
                    <p className="font-medium text-slate-900">{selectedPendingUser.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">メールアドレス</span>
                    <p className="font-medium text-slate-900">{selectedPendingUser.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">登録日時</span>
                    <p className="font-medium text-slate-900">{formatDate(selectedPendingUser.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">メール認証</span>
                    <p className="font-medium">
                      {selectedPendingUser.emailVerified ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <UserCheck className="h-3 w-3 mr-1" aria-hidden="true" />
                          認証済み
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                          <Mail className="h-3 w-3 mr-1" aria-hidden="true" />
                          未認証
                        </Badge>
                      )}
                    </p>
                  </div>
                  {selectedPendingUser.tokenExpiresAt && (
                    <div>
                      <span className="text-sm text-slate-500">トークン有効期限</span>
                      <p className={`font-medium ${new Date(selectedPendingUser.tokenExpiresAt) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                        {formatDate(selectedPendingUser.tokenExpiresAt)}
                        {new Date(selectedPendingUser.tokenExpiresAt) < new Date() && (
                          <span className="ml-2 text-xs text-red-600">(期限切れ)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* 操作ボタン */}
                <div className="space-y-3">
                  {!selectedPendingUser.emailVerified && (
                    <Button
                      onClick={() => handlePendingUserAction('verify')}
                      disabled={isPendingUserActionLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                      {isPendingUserActionLoading && pendingUserAction === 'verify' ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          処理中...
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                          手動でメール認証を完了する
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    onClick={() => handlePendingUserAction('resend')}
                    disabled={isPendingUserActionLoading}
                    variant="outline"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    {isPendingUserActionLoading && pendingUserAction === 'resend' ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        送信中...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                        認証メールを再送信
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => {
                      if (window.confirm(`${selectedPendingUser.name} の仮登録を削除しますか？\n\nこの操作は取り消せません。削除後、同じメールアドレスで新規登録できるようになります。`)) {
                        handlePendingUserAction('delete')
                      }
                    }}
                    disabled={isPendingUserActionLoading}
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50"
                  >
                    {isPendingUserActionLoading && pendingUserAction === 'delete' ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        削除中...
                      </>
                    ) : (
                      <>
                        <UserX className="h-4 w-4 mr-2" aria-hidden="true" />
                        仮登録を削除
                      </>
                    )}
                  </Button>
                </div>

                {/* ヒント */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>ヒント:</strong>
                  </p>
                  <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                    <li>メール認証済みのユーザーは決済ページに進めます</li>
                    <li>トークン期限切れの場合は認証メールを再送信してください</li>
                    <li>削除すると同じメールアドレスで新規登録できます</li>
                    <li><strong>内部スタッフ:</strong> 「ユーザー作成」ボタンで直接登録できます</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ユーザー作成モーダル */}
        {showCreateUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <UserPlus className="h-5 w-5 mr-2" aria-hidden="true" />
                    ユーザー作成
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateUserModal(false)
                      setCreateUserForm({ email: '', password: '', name: '', role: 'MEMBER' })
                      setShowPassword(false)
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-800">
                    内部スタッフ用のユーザーを直接作成します。作成後、メールアドレスとパスワードを本人に共有してください。
                  </p>
                </div>

                {/* 名前 */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createUserForm.name}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                    placeholder="例: 山田 太郎"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={isCreatingUser}
                  />
                </div>

                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                    placeholder="例: example@email.com"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={isCreatingUser}
                    spellCheck={false}
                  />
                </div>

                {/* パスワード */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    パスワード <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={createUserForm.password}
                      onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                      placeholder="6文字以上"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                      disabled={isCreatingUser}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">本人に共有するため、覚えやすいパスワードを設定してください</p>
                </div>

                {/* ロール */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    ロール
                  </label>
                  <select
                    value={createUserForm.role}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                    disabled={isCreatingUser}
                  >
                    <option value="MEMBER">UGS会員（メンバー）</option>
                    <option value="FP">FPエイド</option>
                    <option value="MANAGER">マネージャー</option>
                    <option value="ADMIN">管理者</option>
                  </select>
                </div>

                {/* ボタン */}
                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={() => {
                      setShowCreateUserModal(false)
                      setCreateUserForm({ email: '', password: '', name: '', role: 'MEMBER' })
                      setShowPassword(false)
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={isCreatingUser}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    disabled={isCreatingUser || !createUserForm.email || !createUserForm.password || !createUserForm.name}
                  >
                    {isCreatingUser ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        作成中...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                        ユーザーを作成
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ユーザー一括作成モーダル */}
        {showBulkCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <Upload className="h-5 w-5 mr-2" aria-hidden="true" />
                    ユーザー一括作成
                  </h2>
                  <button
                    onClick={() => {
                      setShowBulkCreateModal(false)
                      setBulkCreateData('')
                      setBulkCreateResult(null)
                    }}
                    className="text-white/80 hover:text-white"
                    disabled={isBulkCreating}
                  >
                    <XCircle className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {!bulkCreateResult ? (
                  <>
                    {/* 入力フォーマットの説明 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-2">入力形式（CSV形式）</h3>
                      <p className="text-sm text-blue-700 mb-2">
                        1行に1ユーザー、カンマ区切りで入力してください。
                      </p>
                      <code className="block bg-blue-100 p-2 rounded text-xs text-blue-800 mb-2">
                        メールアドレス,パスワード,名前,ロール
                      </code>
                      <p className="text-xs text-blue-600">
                        ロール: MEMBER（UGS会員）, FP（FPエイド）, MANAGER（マネージャー）, ADMIN（管理者）<br />
                        ※ロールを省略するとMEMBERになります
                      </p>
                    </div>

                    {/* サンプル */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h3 className="font-semibold text-slate-700 mb-2">入力例</h3>
                      <pre className="text-xs text-slate-600 whitespace-pre-wrap">
{`user1@example.com,password123,山田太郎,MEMBER
user2@example.com,password456,鈴木花子,FP
user3@example.com,password789,佐藤一郎`}
                      </pre>
                    </div>

                    {/* CSV入力エリア */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        ユーザーデータ（最大100件）
                      </label>
                      <textarea
                        value={bulkCreateData}
                        onChange={(e) => setBulkCreateData(e.target.value)}
                        className="w-full h-48 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                        placeholder="メールアドレス,パスワード,名前,ロール"
                        disabled={isBulkCreating}
                      />
                    </div>

                    {/* ボタン */}
                    <div className="flex space-x-3 pt-4">
                      <Button
                        onClick={() => {
                          setShowBulkCreateModal(false)
                          setBulkCreateData('')
                          setBulkCreateResult(null)
                        }}
                        variant="outline"
                        className="flex-1"
                        disabled={isBulkCreating}
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleBulkCreateUsers}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                        disabled={isBulkCreating || !bulkCreateData.trim()}
                      >
                        {isBulkCreating ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            作成中...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                            一括作成を実行
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 結果表示 */}
                    <div className="space-y-4">
                      {/* サマリー */}
                      <div className="bg-slate-50 rounded-lg p-4">
                        <h3 className="font-semibold text-slate-800 mb-3">作成結果</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="bg-white rounded-lg p-3 border">
                            <div className="text-2xl font-bold text-slate-700">{bulkCreateResult.summary.total}</div>
                            <div className="text-sm text-slate-500">合計</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <div className="text-2xl font-bold text-green-600">{bulkCreateResult.summary.success}</div>
                            <div className="text-sm text-green-600">成功</div>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                            <div className="text-2xl font-bold text-red-600">{bulkCreateResult.summary.failed}</div>
                            <div className="text-sm text-red-600">失敗</div>
                          </div>
                        </div>
                      </div>

                      {/* 詳細結果 */}
                      <div className="max-h-64 overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left">メール</th>
                              <th className="px-4 py-2 text-left">結果</th>
                              <th className="px-4 py-2 text-left">会員番号/エラー</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkCreateResult.results.map((result, index) => (
                              <tr key={index} className="border-t">
                                <td className="px-4 py-2 font-mono text-xs">{result.email}</td>
                                <td className="px-4 py-2">
                                  {result.success ? (
                                    <span className="inline-flex items-center text-green-600">
                                      <CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                      成功
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-red-600">
                                      <XCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                      失敗
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-xs">
                                  {result.success ? (
                                    <span className="font-mono text-green-700">{result.memberId}</span>
                                  ) : (
                                    <span className="text-red-600">{result.error}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* 閉じるボタン */}
                      <div className="flex justify-end pt-4">
                        <Button
                          onClick={() => {
                            setShowBulkCreateModal(false)
                            setBulkCreateData('')
                            setBulkCreateResult(null)
                          }}
                          className="bg-slate-600 hover:bg-slate-700 text-white"
                        >
                          閉じる
                        </Button>
                      </div>
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