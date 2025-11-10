import { UserRole as PrismaUserRole } from '@prisma/client'

/**
 * アプリケーション側で使用するロール型（小文字）
 */
export type AppUserRole = 'member' | 'fp' | 'manager' | 'admin'

/**
 * PrismaのUserRole（大文字）をアプリケーション側のロール型（小文字）に変換
 */
export function prismaRoleToAppRole(role: PrismaUserRole): AppUserRole {
  const map: Record<PrismaUserRole, AppUserRole> = {
    MEMBER: 'member',
    FP: 'fp',
    MANAGER: 'manager',
    ADMIN: 'admin',
  }
  return map[role]
}

/**
 * アプリケーション側のロール型（小文字）をPrismaのUserRole（大文字）に変換
 */
export function appRoleToPrismaRole(role: AppUserRole): PrismaUserRole {
  const map: Record<AppUserRole, PrismaUserRole> = {
    'member': PrismaUserRole.MEMBER,
    'fp': PrismaUserRole.FP,
    'manager': PrismaUserRole.MANAGER,
    'admin': PrismaUserRole.ADMIN,
  }
  return map[role]
}

/**
 * 文字列からAppUserRoleに変換（型安全性のため）
 */
export function stringToAppRole(role: string): AppUserRole | null {
  const validRoles: AppUserRole[] = ['member', 'fp', 'manager', 'admin']
  return validRoles.includes(role as AppUserRole) ? (role as AppUserRole) : null
}

/**
 * 文字列からPrismaUserRoleに変換（型安全性のため）
 */
export function stringToPrismaRole(role: string): PrismaUserRole | null {
  const map: Record<string, PrismaUserRole> = {
    'member': PrismaUserRole.MEMBER,
    'MEMBER': PrismaUserRole.MEMBER,
    'fp': PrismaUserRole.FP,
    'FP': PrismaUserRole.FP,
    'manager': PrismaUserRole.MANAGER,
    'MANAGER': PrismaUserRole.MANAGER,
    'admin': PrismaUserRole.ADMIN,
    'ADMIN': PrismaUserRole.ADMIN,
  }
  return map[role] || null
}

