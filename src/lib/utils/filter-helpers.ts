/**
 * フィルター・ソート関連のユーティリティ関数
 * ユーザー一覧などのフィルター・ソート処理で使用
 */

/**
 * ユーザーを検索テキストでフィルター
 * 名前、メールアドレス、会員番号で検索可能
 */
export function filterUsersBySearch<T extends { name: string; email: string; memberId?: string }>(
  users: T[],
  searchTerm: string
): T[] {
  if (!searchTerm) return users

  const lowerSearchTerm = searchTerm.toLowerCase()
  return users.filter(user =>
    user.name.toLowerCase().includes(lowerSearchTerm) ||
    user.email.toLowerCase().includes(lowerSearchTerm) ||
    (user.memberId && user.memberId.toLowerCase().includes(lowerSearchTerm))
  )
}

/**
 * ユーザーをステータスでフィルター
 */
export function filterUsersByStatus<T extends { type?: 'pending' | 'registered'; subscription?: { stripeDetails?: { status?: string } | null } | null }>(
  users: T[],
  statusFilter: 'all' | 'pending' | 'active' | 'canceled' | 'past_due' | 'unpaid'
): T[] {
  if (statusFilter === 'all') return users
  
  return users.filter(user => {
    if (statusFilter === 'pending') {
      return user.type === 'pending'
    }
    
    if (!user.subscription?.stripeDetails) return false
    return user.subscription.stripeDetails.status === statusFilter
  })
}

/**
 * ユーザーを会員ステータスでフィルター
 */
export function filterUsersByMembershipStatus<T extends { membershipStatus?: string }>(
  users: T[],
  membershipStatusFilter: 'all' | 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'DELINQUENT' | 'CANCELLATION_PENDING' | 'CANCELED' | 'TERMINATED' | 'EXPIRED'
): T[] {
  if (membershipStatusFilter === 'all') return users
  return users.filter(user => user.membershipStatus === membershipStatusFilter)
}

/**
 * ユーザーをロールでフィルター
 */
export function filterUsersByRole<T extends { role: string }>(
  users: T[],
  roleFilter: 'all' | string
): T[] {
  if (roleFilter === 'all') return users
  return users.filter(user => user.role === roleFilter)
}

/**
 * ユーザーをソート
 */
export function sortUsers<T extends { name: string; email: string; createdAt: string; lastSignIn?: string | null }>(
  users: T[],
  sortField: 'name' | 'email' | 'createdAt' | 'lastSignIn',
  sortDirection: 'asc' | 'desc'
): T[] {
  const sorted = [...users].sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortField) {
      case 'name':
        aValue = a.name
        bValue = b.name
        break
      case 'email':
        aValue = a.email
        bValue = b.email
        break
      case 'createdAt':
        aValue = new Date(a.createdAt)
        bValue = new Date(b.createdAt)
        break
      case 'lastSignIn':
        aValue = a.lastSignIn ? new Date(a.lastSignIn) : new Date(0)
        bValue = b.lastSignIn ? new Date(b.lastSignIn) : new Date(0)
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })
  
  return sorted
}
