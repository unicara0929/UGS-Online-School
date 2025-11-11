/**
 * クライアント側APIリクエストヘルパー
 * 認証トークンを自動的に含めるfetchラッパー
 */

import { supabase } from '@/lib/supabase'

/**
 * 認証トークンを含むfetchリクエスト
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Supabaseセッションからトークンを取得
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers = new Headers(options.headers)
  
  // トークンがある場合はAuthorizationヘッダーに追加
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
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
}

