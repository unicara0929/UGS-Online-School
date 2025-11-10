// アプリケーション側で使用するロール型（小文字）
// PrismaのUserRole enumとの変換は role-mapper.ts を使用
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
