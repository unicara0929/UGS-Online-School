export type UserRole = 'member' | 'fp' | 'manager' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  createdAt: Date
  updatedAt: Date
}
