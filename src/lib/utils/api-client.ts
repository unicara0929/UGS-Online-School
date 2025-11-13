/**
 * クライアント側APIリクエストヘルパー
 * 認証トークンを自動的に含めるfetchラッパー
 */

import { createClient } from '@/lib/supabase/client'

// シングルトンクライアント（モジュール再読み込み時も再利用）
let supabaseClientInstance: ReturnType<typeof createClient> | null = null

/**
 * Supabaseクライアントを取得（シングルトン）
 */
function getSupabaseClient() {
  // サーバーサイドでは実行しない
  if (typeof window === 'undefined') {
    return null
  }
  
  // 既に作成済みの場合は再利用
  if (supabaseClientInstance) {
    return supabaseClientInstance
  }
  
  try {
    supabaseClientInstance = createClient()
    return supabaseClientInstance
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

/**
 * 認証トークンを含むfetchリクエスト
 * 根本的な解決: 認証が必要なAPI呼び出しで使用し、認証トークンを自動的に送信
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    // サーバーサイドでは実行しない
    if (typeof window === 'undefined') {
      throw new Error('authenticatedFetchはクライアントサイドでのみ実行できます')
    }
    
    // Supabaseクライアントを取得
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('認証サービスが未設定です。環境変数を設定してください。')
    }
    
    // Supabaseセッションからトークンを取得
    // @supabase/ssrのcreateBrowserClientはCookieベースのセッション管理を使用
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Failed to get session:', sessionError)
      throw new Error('認証セッションの取得に失敗しました')
    }
    
    const headers = new Headers(options.headers)
    
    // トークンがある場合はAuthorizationヘッダーに追加
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`)
    } else {
      // セッションがない場合、ユーザー情報を確認
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.warn('Failed to get user:', userError)
      }
      
      if (user && !session) {
        // ユーザーは存在するがセッションがない場合、セッションを再取得を試みる
        console.warn('User exists but session is missing, attempting to refresh session...')
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
          console.warn('Failed to refresh session:', refreshError)
        }
        
        if (newSession?.access_token) {
          headers.set('Authorization', `Bearer ${newSession.access_token}`)
        } else {
          console.warn('No access token found after refresh')
          console.warn('Session debug info:', { 
            hasSession: !!session, 
            hasNewSession: !!newSession,
            hasUser: !!user,
            hasAccessToken: !!session?.access_token,
            hasNewAccessToken: !!newSession?.access_token,
            userId: user?.id
          })
          throw new Error('認証トークンが見つかりません。再度ログインしてください。')
        }
      } else {
        console.warn('No access token found in session')
        console.warn('Session debug info:', { 
          hasSession: !!session, 
          hasUser: !!user,
          hasAccessToken: !!session?.access_token,
          sessionError: sessionError?.message,
          userError: userError?.message
        })
        throw new Error('認証トークンが見つかりません。再度ログインしてください。')
      }
    }
    
    // FormDataの場合はContent-Typeを設定しない（ブラウザが自動設定）
    if (options.body instanceof FormData) {
      // FormDataの場合はContent-Typeヘッダーを削除
      headers.delete('Content-Type')
    }
    
    return fetch(url, {
      ...options,
      headers,
    })
  } catch (error) {
    console.error('authenticatedFetch error:', error)
    throw error
  }
}

