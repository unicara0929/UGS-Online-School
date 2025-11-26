/**
 * ユーザー情報構築のヘルパー関数
 * Supabaseセッション情報からAuthUserオブジェクトを構築するためのユーティリティ
 */

import { AuthUser } from './supabase-auth-service'
import { UserRole } from '@/lib/types'

/**
 * Supabaseユーザー情報から名前を取得
 */
export function extractUserName(
  userMetadata: Record<string, any> | null | undefined,
  email: string | null | undefined
): string {
  return userMetadata?.name || email?.split('@')[0] || 'User'
}

/**
 * Supabaseユーザー情報からロールを取得し、正規化
 */
export function extractAndNormalizeRole(
  userMetadata: Record<string, any> | null | undefined
): UserRole {
  let role = userMetadata?.role || 'MEMBER'
  
  if (typeof role === 'string') {
    role = role.toLowerCase()
  }
  
  return role as UserRole
}

/**
 * Supabaseセッション情報から一時的なAuthUserオブジェクトを構築
 * データベース接続エラー時に使用
 */
export function createTemporaryUserFromSession(
  supabaseUser: {
    id: string
    email?: string | null
    user_metadata?: Record<string, any> | null
    created_at: string
    updated_at?: string | null
  },
  fallbackEmail?: string
): AuthUser {
  const userName = extractUserName(supabaseUser.user_metadata, supabaseUser.email || fallbackEmail)
  const userRole = extractAndNormalizeRole(supabaseUser.user_metadata)
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || fallbackEmail || '',
    name: userName,
    role: userRole,
    memberId: '', // 一時的なユーザー情報では会員番号は取得できない
    referralCode: null,
    createdAt: new Date(supabaseUser.created_at),
    updatedAt: new Date(supabaseUser.updated_at || supabaseUser.created_at),
  }
}

