/**
 * API認証・認可ヘルパー関数
 * すべてのAPIエンドポイントで共通して使用する認証・認可チェック
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

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
    let supabaseUser = null
    const requestUrl = new URL(request.url)
    console.log(`[AUTH] Authenticating request to: ${requestUrl.pathname}`)

    // 1. Bearer トークン認証を試行（API クライアント用）
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      console.log('[AUTH] Attempting Bearer token authentication')
      const token = authHeader.substring(7)
      const {
        data: { user },
        error: tokenError,
      } = await supabaseAdmin.auth.getUser(token)

      if (!tokenError && user) {
        console.log('[AUTH] Bearer token authentication successful:', user.id)
        supabaseUser = user
      } else {
        console.log('[AUTH] Bearer token authentication failed:', tokenError?.message)
      }
    }

    // 2. Cookie ベース認証にフォールバック（ブラウザ用）
    if (!supabaseUser) {
      console.log('[AUTH] Attempting cookie-based authentication')
      try {
        const supabase = await createClient()
        const {
          data: { user },
          error: sessionError,
        } = await supabase.auth.getUser()

        if (!sessionError && user) {
          console.log('[AUTH] Cookie-based authentication successful:', user.id)
          supabaseUser = user
        } else {
          console.log('[AUTH] Cookie-based authentication failed:', sessionError?.message)
        }
      } catch (cookieError) {
        console.error('[AUTH] Cookie-based authentication error:', cookieError)
        // Cookie認証が失敗しても続行（Bearerトークンがない場合のみエラー）
      }
    }

    // 3. 認証失敗
    if (!supabaseUser) {
      console.log('[AUTH] Authentication failed - no valid user found')
      return {
        user: null,
        error: NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        ),
      }
    }
    
    const user = supabaseUser
    
    // 4. Prisma プロファイルを取得
    // 根本的な解決: リトライではなく、接続プール設定を最適化することで問題を解決
    let profile
    try {
      profile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          role: true,
        },
      })
    } catch (dbError: any) {
      console.error('Database error in getAuthenticatedUser:', dbError)
      console.error('Error details:', {
        errorName: dbError.constructor?.name,
        errorCode: dbError.code,
        errorMessage: dbError.message,
        userId: user.id
      })
      
      // データベース接続エラーの場合
      if (dbError.constructor?.name === 'PrismaClientInitializationError' || 
          dbError.message?.includes('Can\'t reach database server') ||
          dbError.message?.includes('database server') ||
          dbError.message?.includes('Tenant or user not found') ||
          dbError.message?.includes('FATAL') ||
          dbError.code === 'P1001' ||
          dbError.code === 'P1017') {
        return {
          user: null,
          error: NextResponse.json(
            { 
              error: 'データベースに接続できません。接続設定を確認してください。',
              details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            },
            { status: 503 }
          ),
        }
      }
      
      // その他のデータベースエラー
      return {
        user: null,
        error: NextResponse.json(
          { 
            error: 'ユーザープロファイルの取得に失敗しました',
            details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
          },
          { status: 500 }
        ),
      }
    }

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
  } catch (error: any) {
    console.error('Authentication error:', error)
    console.error('Error details:', {
      errorName: error.constructor?.name,
      errorCode: error.code,
      errorMessage: error.message,
      stack: error.stack
    })
    
    // データベース接続エラーの場合
    if (error.constructor?.name === 'PrismaClientInitializationError' || 
        error.message?.includes('Can\'t reach database server') ||
        error.message?.includes('database server') ||
        error.message?.includes('Tenant or user not found') ||
        error.message?.includes('FATAL') ||
        error.code === 'P1001' ||
        error.code === 'P1017') {
      return {
        user: null,
        error: NextResponse.json(
          { 
            error: 'データベースに接続できません。接続設定を確認してください。',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 503 }
        ),
      }
    }
    
    return {
      user: null,
      error: NextResponse.json(
        { 
          error: '認証処理に失敗しました',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
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
 * FPエイド向け動画ガイダンス完了チェック
 * FPエイドの場合、オンボーディングが完了しているか確認
 */
export async function checkFPOnboarding(
  userId: string,
  userRole: string
): Promise<{ completed: boolean; error: NextResponse | null }> {
  // FPエイドでない場合はチェック不要
  if (userRole.toLowerCase() !== 'fp') {
    return { completed: true, error: null }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fpOnboardingCompleted: true
      }
    })

    if (!user) {
      return {
        completed: false,
        error: NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        )
      }
    }

    if (!user.fpOnboardingCompleted) {
      return {
        completed: false,
        error: NextResponse.json(
          {
            error: 'FPエイド向け動画ガイダンスを完了してください',
            actionUrl: '/dashboard/fp-onboarding'
          },
          { status: 403 }
        )
      }
    }

    return { completed: true, error: null }
  } catch (error) {
    console.error('Check FP onboarding error:', error)
    return {
      completed: false,
      error: NextResponse.json(
        { error: 'オンボーディング状況の確認に失敗しました' },
        { status: 500 }
      )
    }
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
