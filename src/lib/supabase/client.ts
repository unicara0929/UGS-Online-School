/**
 * ブラウザ側用のSupabaseクライアント（Cookieベース）
 * @supabase/ssrを使用してCookieベースのセッション管理を実現
 * 根本的な解決: シングルトンパターンで同じインスタンスを再利用し、セッションの一貫性を保つ
 * 
 * グローバル変数に保存して、モジュール再読み込み時も同じインスタンスを再利用
 */

import { createBrowserClient } from '@supabase/ssr'

// グローバル変数に保存して、モジュール再読み込み時も同じインスタンスを再利用
declare global {
  var __browserSupabaseClient: ReturnType<typeof createBrowserClient> | undefined
}

// シングルトンクライアント（モジュール再読み込み時も再利用）
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // サーバーサイドでは実行しない
  if (typeof window === 'undefined') {
    throw new Error('createClientはクライアントサイドでのみ実行できます')
  }
  
  // グローバル変数に既に存在する場合はそれを使用
  if (globalThis.__browserSupabaseClient) {
    return globalThis.__browserSupabaseClient
  }
  
  // 既に作成済みの場合は再利用
  if (browserClientInstance) {
    globalThis.__browserSupabaseClient = browserClientInstance
    return browserClientInstance
  }
  
  // 環境変数から引用符を削除
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^["]|["]$/g, '') || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/^["]|["]$/g, '') || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase環境変数が設定されていません')
  }

  // シングルトンとして保存
  browserClientInstance = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return document.cookie.split('; ').map(cookie => {
            const [name, ...rest] = cookie.split('=')
            return { name, value: rest.join('=') }
          })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = `${name}=${value}; ${options?.maxAge ? `max-age=${options.maxAge};` : ''} ${options?.path ? `path=${options.path};` : ''} ${options?.domain ? `domain=${options.domain};` : ''} ${options?.sameSite ? `samesite=${options.sameSite};` : ''} ${options?.secure ? 'secure;' : ''}`
          })
        },
      },
    }
  )
  
  // グローバル変数に保存（モジュール再読み込み時も再利用）
  globalThis.__browserSupabaseClient = browserClientInstance
  
  return browserClientInstance
}
