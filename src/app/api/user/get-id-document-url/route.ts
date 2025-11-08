import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('filePath')
    const userId = searchParams.get('userId')

    if (!filePath || !userId) {
      return NextResponse.json(
        { error: 'ファイルパスとユーザーIDが必要です' },
        { status: 400 }
      )
    }

    // 認証チェック（簡易版 - 実際にはSupabaseのセッションを使用）
    // TODO: 適切な認証を実装
    // ユーザーが自分のファイルのみアクセスできるようにする
    
    // ファイルパスからユーザーIDを抽出して検証
    const filePathUserId = filePath.split('/')[0]
    if (filePathUserId !== userId) {
      return NextResponse.json(
        { error: 'このファイルにアクセスする権限がありません' },
        { status: 403 }
      )
    }

    const bucketName = process.env.SUPABASE_STORAGE_BUCKET_NAME || 'UGS-up-load' // バケット名

    // 署名付きURLを生成（1時間有効）
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600) // 1時間

    if (urlError || !urlData) {
      console.error('Signed URL generation error:', urlError)
      return NextResponse.json(
        { error: 'ファイルURLの生成に失敗しました', details: urlError?.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      fileUrl: urlData.signedUrl,
    })
  } catch (error: any) {
    console.error('Error generating signed URL:', error)
    return NextResponse.json(
      { error: 'ファイルURLの生成に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}

