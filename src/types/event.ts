// イベント関連の型定義

export type TargetRole = 'member' | 'fp' | 'manager' | 'all'
export type AttendanceType = 'required' | 'optional'
export type VenueType = 'online' | 'offline' | 'hybrid'
export type EventStatus = 'upcoming' | 'completed' | 'cancelled'
export type EventType = 'required' | 'optional' | 'manager-only'
export type ParticipantStatus = 'attended_code' | 'attended_video' | 'exempted' | 'video_incomplete' | 'registered' | 'not_responded'

export interface EventRegistration {
  id: string
  userId: string
  userName: string
  userEmail: string
  userMemberId: string | null
  registeredAt: string
  // 出席状況
  attendanceMethod: string | null
  attendanceCompletedAt: string | null
  videoWatched: boolean
  surveyCompleted: boolean
  // ステータス
  status: ParticipantStatus
  statusLabel: string
  // 欠席申請
  hasExemption: boolean
  exemptionStatus: string | null
  exemptionReason: string | null
}

export interface EventSchedule {
  id: string
  date: string
  time: string
  location: string
  onlineMeetingUrl: string | null
  status: string
  attendanceCode: string | null
  registrationCount: number
}

export interface AdminEventItem {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: EventType
  targetRoles: TargetRole[]
  attendanceType: AttendanceType
  venueType: VenueType
  location: string
  maxParticipants: number | null
  status: EventStatus
  thumbnailUrl: string | null
  currentParticipants: number
  registrations: EventRegistration[]
  // スケジュール一覧
  schedules?: EventSchedule[]
  // 出席確認関連
  attendanceCode: string | null
  vimeoUrl: string | null
  surveyUrl: string | null
  attendanceDeadline: string | null
  // 全体MTG関連
  isRecurring: boolean
  applicationDeadline: string | null
  onlineMeetingUrl: string | null
  // 外部参加者設定
  allowExternalParticipation: boolean
  externalRegistrationToken: string | null
  // 過去イベント記録用
  summary: string | null
  photos: string[]
  materialsUrl: string | null
  actualParticipants: number | null
  actualLocation: string | null
  adminNotes: string | null
  isArchiveOnly: boolean
}

export interface EventFormData {
  title: string
  description: string
  date: string
  time: string
  type: EventType
  targetRoles: TargetRole[]
  attendanceType: AttendanceType
  venueType: VenueType
  location: string
  maxParticipants: number | null
  status: EventStatus
  thumbnailUrl: string | null
  isPaid: boolean
  price: number | null
  // オンライン参加URL
  onlineMeetingUrl: string | null
  // 出席確認関連
  attendanceCode: string | null
  surveyUrl: string | null
  attendanceDeadline: string | null
  // 全体MTG関連
  isRecurring: boolean
  applicationDeadline: string | null
  // 外部参加者設定
  allowExternalParticipation: boolean
  externalRegistrationToken: string | null
  // 過去イベント記録用
  summary: string | null
  photos: string[]
  materialsUrl: string | null
  vimeoUrl: string | null
  actualParticipants: number | null
  actualLocation: string | null
  adminNotes: string | null
  isArchiveOnly: boolean
}

export const DEFAULT_EVENT_FORM: EventFormData = {
  title: '',
  description: '',
  date: '',
  time: '',
  type: 'optional',
  targetRoles: [],
  attendanceType: 'optional',
  venueType: 'online',
  location: '',
  maxParticipants: null,
  status: 'upcoming',
  thumbnailUrl: null,
  isPaid: false,
  price: null,
  // オンライン参加URL
  onlineMeetingUrl: null,
  // 出席確認関連
  attendanceCode: null,
  surveyUrl: null,
  attendanceDeadline: null,
  // 全体MTG関連
  isRecurring: false,
  applicationDeadline: null,
  // 外部参加者設定
  allowExternalParticipation: false,
  externalRegistrationToken: null,
  // 過去イベント記録用
  summary: null,
  photos: [],
  materialsUrl: null,
  vimeoUrl: null,
  actualParticipants: null,
  actualLocation: null,
  adminNotes: null,
  isArchiveOnly: false,
}
