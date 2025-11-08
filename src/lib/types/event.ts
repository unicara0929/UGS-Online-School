export interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: 'required' | 'optional' | 'manager-only'
  isOnline: boolean
  location?: string
  maxParticipants: number | null
  currentParticipants: number
  isRegistered: boolean
  status: 'upcoming' | 'completed' | 'cancelled'
}
