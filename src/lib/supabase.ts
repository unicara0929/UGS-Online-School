import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey
  })
}

export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key')

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
