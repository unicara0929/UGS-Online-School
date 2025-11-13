/**
 * ユーザー関連のユーティリティ関数
 * 管理画面などで使用する共通のヘルパー関数
 */

/**
 * ロールのラベルを取得
 */
export function getRoleLabel(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '管理者'
    case 'MANAGER':
      return 'マネージャー'
    case 'FP':
      return 'FPエイド'
    case 'MEMBER':
      return 'メンバー'
    case 'PENDING':
      return '仮登録'
    default:
      return role
  }
}

/**
 * ロールのBadgeバリアントを取得
 */
export function getRoleBadgeVariant(role: string): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'ADMIN':
      return 'destructive'
    case 'MANAGER':
      return 'default'
    case 'FP':
      return 'secondary'
    case 'MEMBER':
    case 'PENDING':
      return 'outline'
    default:
      return 'outline'
  }
}

/**
 * 日付をフォーマット
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '未設定'
  return new Date(dateString).toLocaleString('ja-JP')
}

/**
 * 通貨をフォーマット
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}
