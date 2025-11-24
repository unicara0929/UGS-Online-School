import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * イベント写真アップロードAPI
 * POST /api/admin/events/upload-photo
 *
 * 過去イベントの記録として複数の写真をアップロードするためのAPI
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック（管理者のみ）
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    if (authUser!.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '管理者のみアクセス可能です' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const eventId = formData.get('eventId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが必要です' },
        { status: 400 }
      )
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'イベントIDが必要です' },
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

    // ファイルタイプチェック（画像のみ）
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '画像ファイル（JPEG、PNG、WebP、GIF）のみアップロード可能です' },
        { status: 400 }
      )
    }

    // ファイルをバッファに読み込む
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // ファイル名を生成（イベントID/タイムスタンプ_元のファイル名）
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `event-photos/${eventId}/${timestamp}_${sanitizedFileName}`

    // Supabase Storageにアップロード
    const bucketName = 'profile-picture'

    console.log('Uploading event photo to bucket:', bucketName, 'path:', fileName)

    const { data, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError)

      const errorMessage = uploadError.message || ''
      const errorStatus = (uploadError as any).status || (uploadError as any).statusCode

      console.error('Upload error details:', {
        message: errorMessage,
        status: errorStatus,
        bucketName: bucketName,
        error: uploadError
      })

      if (errorMessage.includes('Bucket not found') || errorStatus === 404 || errorStatus === '404') {
        return NextResponse.json(
          {
            error: 'ストレージバケットが見つかりません',
            details: `バケット名「${bucketName}」がSupabaseに存在しないか、名前が一致していません。`,
            errorCode: 'BUCKET_NOT_FOUND',
            bucketName: bucketName
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: 'ファイルのアップロードに失敗しました', details: errorMessage },
        { status: 500 }
      )
    }

    // パブリックURLを取得
    const publicUrl = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fileName).data.publicUrl

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      filePath: fileName,
    })
  } catch (error: any) {
    console.error('Error uploading event photo to Supabase Storage:', error)
    return NextResponse.json(
      { error: 'ファイルのアップロードに失敗しました', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * イベント写真削除API
 * DELETE /api/admin/events/upload-photo
 */
export async function DELETE(request: NextRequest) {
  try {
    // 認証チェック（管理者のみ）
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    if (authUser!.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '管理者のみアクセス可能です' },
        { status: 403 }
      )
    }

    const { filePath } = await request.json()

    if (!filePath) {
      return NextResponse.json(
        { error: 'ファイルパスが必要です' },
        { status: 400 }
      )
    }

    const bucketName = 'profile-picture'

    // Supabase Storageから削除
    const { error: deleteError } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([filePath])

    if (deleteError) {
      console.error('Supabase Storage delete error:', deleteError)
      return NextResponse.json(
        { error: 'ファイルの削除に失敗しました', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'ファイルを削除しました',
    })
  } catch (error: any) {
    console.error('Error deleting event photo from Supabase Storage:', error)
    return NextResponse.json(
      { error: 'ファイルの削除に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}
