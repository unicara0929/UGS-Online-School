export interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: 'required' | 'optional' | 'manager-only' // 後方互換性のため残す
  targetRoles: ('member' | 'fp' | 'manager' | 'all')[]
  attendanceType: 'required' | 'optional'
  venueType: 'online' | 'offline' | 'hybrid'
  location?: string
  maxParticipants: number | null
  currentParticipants: number
  isRegistered: boolean
  status: 'upcoming' | 'completed' | 'cancelled'
}
