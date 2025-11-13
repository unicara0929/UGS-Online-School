import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 環境変数から引用符を削除（.env.localで引用符が含まれている場合に対応）
const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^["']|["']$/g, '') || ''
const supabaseAnonKeyRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/^["']|["']$/g, '') || ''

// URLの検証（空文字列や無効なURLをチェック）
const isValidUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return false
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

const supabaseUrl = isValidUrl(supabaseUrlRaw) ? supabaseUrlRaw : ''
const supabaseAnonKey = supabaseAnonKeyRaw.trim() !== '' ? supabaseAnonKeyRaw : ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing or invalid Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    urlValid: isValidUrl(supabaseUrlRaw),
    urlLength: supabaseUrlRaw.length
  })
}

// サーバーサイド用のクライアント（Service Role Key使用）
// クライアント側は @/lib/supabase/client を使用してください
// 環境変数から引用符を削除（.env.localで引用符が含まれている場合に対応）
const serviceRoleKeyRaw = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/^["']|["']$/g, '') || ''

// supabaseAdminは常に有効なクライアントを返す（型アサーションで明示）
// サーバーサイド用なので、URLとキーの検証を確実に行う
const adminUrl = supabaseUrl && isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co'
const adminKey = (serviceRoleKeyRaw && serviceRoleKeyRaw.trim() !== '') 
  ? serviceRoleKeyRaw 
  : (supabaseAnonKey && supabaseAnonKey.trim() !== '' ? supabaseAnonKey : 'placeholder-key')

export const supabaseAdmin: SupabaseClient = createClient(adminUrl, adminKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) as SupabaseClient
