/**
 * イベント関連の定数定義
 * DB値（大文字）とAPI値（小文字）の変換マッピング
 */

// === 出力用マッピング（DB値 → API値）===

export const EVENT_TYPE_MAP = {
  REQUIRED: 'required',
  OPTIONAL: 'optional',
  MANAGER_ONLY: 'manager-only',
} as const

export const EVENT_TARGET_ROLE_MAP = {
  MEMBER: 'member',
  FP: 'fp',
  MANAGER: 'manager',
  ALL: 'all',
} as const

export const EVENT_ATTENDANCE_TYPE_MAP = {
  REQUIRED: 'required',
  OPTIONAL: 'optional',
} as const

export const EVENT_STATUS_MAP = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export const EVENT_VENUE_TYPE_MAP = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  HYBRID: 'hybrid',
} as const

// === 入力用マッピング（API値 → DB値）===

export const EVENT_TYPE_INPUT_MAP: Record<string, 'REQUIRED' | 'OPTIONAL' | 'MANAGER_ONLY'> = {
  required: 'REQUIRED',
  optional: 'OPTIONAL',
  'manager-only': 'MANAGER_ONLY',
}

export const EVENT_VENUE_TYPE_INPUT_MAP: Record<string, 'ONLINE' | 'OFFLINE' | 'HYBRID'> = {
  online: 'ONLINE',
  offline: 'OFFLINE',
  hybrid: 'HYBRID',
}

export const EVENT_TARGET_ROLE_INPUT_MAP: Record<string, 'MEMBER' | 'FP' | 'MANAGER' | 'ALL'> = {
  member: 'MEMBER',
  fp: 'FP',
  manager: 'MANAGER',
  all: 'ALL',
}

export const EVENT_ATTENDANCE_TYPE_INPUT_MAP: Record<string, 'REQUIRED' | 'OPTIONAL'> = {
  required: 'REQUIRED',
  optional: 'OPTIONAL',
}

export const EVENT_STATUS_INPUT_MAP: Record<string, 'UPCOMING' | 'COMPLETED' | 'CANCELLED'> = {
  upcoming: 'UPCOMING',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
}

// === 型定義 ===

export type EventType = keyof typeof EVENT_TYPE_MAP
export type EventTargetRole = keyof typeof EVENT_TARGET_ROLE_MAP
export type EventAttendanceType = keyof typeof EVENT_ATTENDANCE_TYPE_MAP
export type EventStatus = keyof typeof EVENT_STATUS_MAP
export type EventVenueType = keyof typeof EVENT_VENUE_TYPE_MAP
