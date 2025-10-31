export interface Notification {
  id: string
  title: string
  message: string
  type: 'action' | 'info' | 'success'
  isRead: boolean
  createdAt: Date
  actionUrl?: string
}
