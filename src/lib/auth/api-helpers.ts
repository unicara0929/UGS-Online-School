/**
 * API認証・認可ヘルパー関数
 * すべてのAPIエンドポイントで共通して使用する認証・認可チェック
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

export interface AuthUser {
  id: string
  email: string
  role: string
}

/**
 * リクエストから認証ユーザーを取得
 * 認証チェックとプロファイル取得を行う
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ user: AuthUser | null; error: NextResponse | null }> {
  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      // Cookieからセッションを取得（Supabaseのデフォルト動作）
      const cookieHeader = request.headers.get('cookie')
      if (!cookieHeader) {
        return {
          user: null,
          error: NextResponse.json(
            { error: '認証が必要です' },
            { status: 401 }
          ),
        }
      }
      
      // Cookieからセッションを検証するため、Supabase Adminを使用
      // 実際には、Cookieから直接ユーザーIDを取得するか、別の方法を使用
      return {
        user: null,
        error: NextResponse.json(
          { error: '認証が必要です。Authorizationヘッダーを設定してください。' },
          { status: 401 }
        ),
      }
    }
    
    const token = authHeader.substring(7)
    
    // Supabase Adminを使用してトークンを検証
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return {
        user: null,
        error: NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        ),
      }
    }
    
    // Prismaプロファイルを取得
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    if (!profile) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'ユーザープロファイルが見つかりません' },
          { status: 404 }
        ),
      }
    }

    return {
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
      },
      error: null,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      user: null,
      error: NextResponse.json(
        { error: '認証処理に失敗しました' },
        { status: 500 }
      ),
    }
  }
}

/**
 * ロールチェック
 * ユーザーが指定されたロールのいずれかを持っているか確認
 */
export function checkRole(
  userRole: string,
  allowedRoles: readonly string[]
): { allowed: boolean; error: NextResponse | null } {
  // ロールを小文字に統一して比較
  const normalizedUserRole = userRole.toLowerCase()
  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase())

  if (normalizedAllowedRoles.includes(normalizedUserRole)) {
    return { allowed: true, error: null }
  }

  return {
    allowed: false,
    error: NextResponse.json(
      {
        error: `アクセス権限がありません。必要なロール: ${allowedRoles.join(', ')}`,
      },
      { status: 403 }
    ),
  }
}

/**
 * 管理者チェック
 * ユーザーが管理者権限を持っているか確認
 */
export function checkAdmin(userRole: string): {
  isAdmin: boolean
  error: NextResponse | null
} {
  const normalizedRole = userRole.toLowerCase()

  if (normalizedRole === 'admin') {
    return { isAdmin: true, error: null }
  }

  return {
    isAdmin: false,
    error: NextResponse.json(
      { error: 'アクセス権限がありません。管理者権限が必要です。' },
      { status: 403 }
    ),
  }
}

/**
 * 所有権チェック
 * リソースの所有者または管理者のみがアクセス可能
 */
export function checkOwnershipOrAdmin(
  resourceUserId: string,
  requestUserId: string,
  userRole: string
): { allowed: boolean; error: NextResponse | null } {
  const normalizedRole = userRole.toLowerCase()

  // 管理者または所有者の場合はアクセス許可
  if (normalizedRole === 'admin' || resourceUserId === requestUserId) {
    return { allowed: true, error: null }
  }

  return {
    allowed: false,
    error: NextResponse.json(
      {
        error: 'アクセス権限がありません。自分のデータまたは管理者権限が必要です。',
      },
      { status: 403 }
    ),
  }
}

/**
 * ロール定義（Prisma Enumと一致）
 */
export const Roles = {
  MEMBER: 'member',
  FP: 'fp',
  MANAGER: 'manager',
  ADMIN: 'admin',
} as const

/**
 * ロールグループ定義
 */
export const RoleGroups = {
  // FP以上（FP、マネージャー、管理者）
  FP_AND_ABOVE: [Roles.FP, Roles.MANAGER, Roles.ADMIN],
  // マネージャー以上（マネージャー、管理者）
  MANAGER_AND_ABOVE: [Roles.MANAGER, Roles.ADMIN],
  // 管理者のみ
  ADMIN_ONLY: [Roles.ADMIN],
  // 全ロール
  ALL_ROLES: [Roles.MEMBER, Roles.FP, Roles.MANAGER, Roles.ADMIN],
} as const
