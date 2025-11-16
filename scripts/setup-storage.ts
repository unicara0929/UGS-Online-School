/**
 * Supabase Storageのセットアップスクリプト
 *
 * 使い方:
 * npx tsx scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js'

async function setupStorage() {
  console.log('🚀 Supabase Storageのセットアップを開始します...\n')

  // 環境変数から設定を取得
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^["]|["]$/g, '') || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/^["]|["]$/g, '') || ''

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ エラー: Supabase環境変数が設定されていません')
    console.error('   NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を確認してください')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // 既存のバケットを確認
    console.log('📦 既存のバケットを確認中...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ バケット一覧の取得に失敗しました:', listError.message)
      process.exit(1)
    }

    const materialsExists = buckets?.some(bucket => bucket.name === 'materials')

    if (materialsExists) {
      console.log('✅ バケット "materials" は既に存在します')
      console.log('\n✨ セットアップ完了！')
      return
    }

    // バケットを作成
    console.log('📦 バケット "materials" を作成中...')
    const { data: bucket, error: createError } = await supabase.storage.createBucket('materials', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed'
      ]
    })

    if (createError) {
      console.error('❌ バケットの作成に失敗しました:', createError.message)
      process.exit(1)
    }

    console.log('✅ バケット "materials" を作成しました')

    // バケットのポリシーを設定（公開読み取り）
    console.log('🔐 バケットのアクセスポリシーを設定中...')

    // 注意: Supabase CLIまたはダッシュボードでRLSポリシーを設定する必要があります
    console.log('⚠️  注意: バケットのRLSポリシーはSupabaseダッシュボードで設定してください')
    console.log('   推奨ポリシー:')
    console.log('   - 読み取り: すべてのユーザーに許可（public bucket）')
    console.log('   - アップロード: 管理者のみに許可')
    console.log('   - 削除: 管理者のみに許可')

    console.log('\n✨ セットアップ完了！')
    console.log('   バケット名: materials')
    console.log('   公開: はい')
    console.log('   最大ファイルサイズ: 50MB')
  } catch (error) {
    console.error('❌ 予期しないエラーが発生しました:', error)
    process.exit(1)
  }
}

setupStorage()
