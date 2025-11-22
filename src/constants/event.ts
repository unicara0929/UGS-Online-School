// イベント関連の定数とラベル定義

import type { TargetRole, AttendanceType, VenueType, EventStatus } from '@/types/event'

// 対象ロールの選択肢
export const TARGET_ROLE_OPTIONS: { value: TargetRole; label: string }[] = [
  { value: 'member', label: 'UGS会員' },
  { value: 'fp', label: 'FPエイド' },
  { value: 'manager', label: 'マネージャー' },
  { value: 'all', label: '全員' },
]

// 開催形式の選択肢
export const VENUE_TYPE_OPTIONS: { value: VenueType; label: string }[] = [
  { value: 'online', label: 'オンライン' },
  { value: 'offline', label: 'オフライン' },
  { value: 'hybrid', label: 'ハイブリッド（オンライン＋オフライン）' },
]

// 参加設定の選択肢
export const ATTENDANCE_TYPE_OPTIONS: { value: AttendanceType; label: string }[] = [
  { value: 'optional', label: '任意' },
  { value: 'required', label: '必須' },
]

// ステータスの選択肢
export const EVENT_STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'upcoming', label: '予定' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: '中止' },
]

// ラベル取得関数
export const getTargetRoleLabel = (role: string): string => {
  const option = TARGET_ROLE_OPTIONS.find(opt => opt.value === role)
  return option?.label ?? role
}

export const getAttendanceTypeLabel = (type: string): string => {
  const option = ATTENDANCE_TYPE_OPTIONS.find(opt => opt.value === type)
  return option?.label ?? type
}

export const getVenueTypeLabel = (type: string): string => {
  const option = VENUE_TYPE_OPTIONS.find(opt => opt.value === type)
  return option?.label ?? type
}

export const getEventStatusLabel = (status: string): string => {
  const option = EVENT_STATUS_OPTIONS.find(opt => opt.value === status)
  return option?.label ?? status
}

// サムネイル関連の定数
export const THUMBNAIL_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  recommendedSize: '16:9（例: 1280x720px）',
}
