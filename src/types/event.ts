// イベント関連の型定義

export type TargetRole = 'member' | 'fp' | 'manager' | 'all'
export type AttendanceType = 'required' | 'optional'
export type VenueType = 'online' | 'offline' | 'hybrid'
export type EventStatus = 'upcoming' | 'completed' | 'cancelled'
export type EventType = 'required' | 'optional' | 'manager-only'

export interface EventRegistration {
  id: string
  userId: string
  userName: string
  userEmail: string
  registeredAt: string
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
  maxParticipants: 50,
  status: 'upcoming',
  thumbnailUrl: null,
  isPaid: false,
  price: null,
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
