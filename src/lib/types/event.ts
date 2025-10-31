export interface Event {
  id: string
  title: string
  description: string
  date: Date
  type: 'required' | 'optional' | 'manager-only'
  isOnline: boolean
  location?: string
  maxParticipants: number
  currentParticipants: number
  isRegistered: boolean
}
