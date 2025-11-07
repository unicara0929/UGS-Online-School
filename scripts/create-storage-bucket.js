/**
 * Supabase Storageバケット作成スクリプト
 * 
 * 使用方法:
 * 1. 環境変数を設定:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 * 
 * 2. スクリプトを実行:
 *    node scripts/create-storage-bucket.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createBucket() {
  try {
    console.log('🔄 Supabase Storageバケットを作成中...')
    
    // バケットが既に存在するか確認
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ バケット一覧の取得に失敗しました:', listError.message)
      process.exit(1)
    }
    
    const existingBucket = buckets?.find(bucket => bucket.name === 'id-documents')
    
    if (existingBucket) {
      console.log('✅ バケット「id-documents」は既に存在します')
      console.log('バケット情報:', existingBucket)
      return
    }
    
    // バケットを作成
    const { data, error } = await supabase.storage.createBucket('id-documents', {
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    })
    
    if (error) {
      console.error('❌ バケットの作成に失敗しました:', error.message)
      process.exit(1)
    }
    
    console.log('✅ バケット「id-documents」を作成しました')
    console.log('バケット情報:', data)
    
    console.log('\n📝 次のステップ:')
    console.log('1. SupabaseダッシュボードでRLSポリシーを設定してください')
    console.log('2. README-SUPABASE-STORAGE.md を参照してポリシーを設定してください')
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message)
    process.exit(1)
  }
}

createBucket()

