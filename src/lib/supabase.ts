import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey
  })
}

// ブラウザ側のSupabaseクライアントをシングルトン化（グローバル変数を使用）
declare global {
  var __supabaseClient: SupabaseClient | undefined
}

export const supabase: SupabaseClient = (() => {
  // ブラウザ環境でグローバル変数に既に存在する場合はそれを使用
  if (typeof window !== 'undefined' && globalThis.__supabaseClient) {
    return globalThis.__supabaseClient
  }
  
  const client = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storageKey: 'ugs-auth', // 衝突回避＆統一
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : createClient('https://placeholder.supabase.co', 'placeholder-key', {
        auth: {
          storageKey: 'ugs-auth',
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
  
  // ブラウザ環境でグローバル変数に保存（モジュール再読み込み時も再利用）
  if (typeof window !== 'undefined') {
    globalThis.__supabaseClient = client
  }
  
  return client
})()

// サーバーサイド用のクライアント（Service Role Key使用）
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// supabaseAdminは常に有効なクライアントを返す（型アサーションで明示）
export const supabaseAdmin: SupabaseClient = (
  supabaseUrl && serviceRoleKey
    ? createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
    : (supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }) // フォールバック: anon keyを使用
        : createClient('https://placeholder.supabase.co', 'placeholder-key', {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          })) // 最終フォールバック: プレースホルダー
) as SupabaseClient
