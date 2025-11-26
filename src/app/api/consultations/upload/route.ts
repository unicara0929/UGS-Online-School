import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 個別相談の添付ファイルアップロード
 * POST /api/consultations/upload
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが必要です' },
        { status: 400 }
      )
    }

    // ファイルサイズチェック（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは10MB以下にしてください' },
        { status: 400 }
      )
    }

    // ファイルタイプチェック（画像とPDF）
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'image/webp',
      'application/pdf',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'JPEG、PNG、GIF、WebP、PDFファイルのみアップロード可能です' },
        { status: 400 }
      )
    }

    // ファイルをバッファに読み込む
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // ファイル名を生成（consultations/ユーザーID/タイムスタンプ_元のファイル名）
    const userId = authUser!.id
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `consultations/${userId}/${timestamp}_${sanitizedFileName}`

    // Supabase Storageにアップロード
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET_NAME || 'UGS-up-load'

    const { data, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'ファイルのアップロードに失敗しました', details: uploadError.message },
        { status: 500 }
      )
    }

    // 署名付きURLを生成（24時間有効）
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(fileName, 86400) // 24時間

    if (urlError || !urlData) {
      console.error('Signed URL generation error:', urlError)
      return NextResponse.json(
        { error: 'ファイルURLの生成に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      fileUrl: urlData.signedUrl,
      filePath: fileName,
      fileName: file.name,
    })
  } catch (error: any) {
    console.error('Error uploading consultation file:', error)
    return NextResponse.json(
      { error: 'ファイルのアップロードに失敗しました', details: error.message },
      { status: 500 }
    )
  }
}
