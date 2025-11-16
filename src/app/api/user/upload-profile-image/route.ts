import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const formData = await request.formData()
    const file = formData.get('file') as File

    // 認証ユーザーのIDを使用
    const userId = authUser!.id

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが必要です' },
        { status: 400 }
      )
    }

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは5MB以下にしてください' },
        { status: 400 }
      )
    }

    // ファイルタイプチェック（画像のみ）
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '画像ファイル（JPEG、PNG、GIF、WebP）のみアップロード可能です' },
        { status: 400 }
      )
    }

    // ファイルをバッファに読み込む
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // ファイル名を生成（ユーザーID_タイムスタンプ_元のファイル名）
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `profile-images/${userId}/${timestamp}_${sanitizedFileName}`

    // Supabase Storageにアップロード（プロフィール画像専用バケット）
    const bucketName = 'profile-picture'

    console.log('Uploading profile image to bucket:', bucketName)

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

    // データベースに保存（UserテーブルのprofileImageUrlを更新）
    await prisma.user.update({
      where: { id: userId },
      data: {
        profileImageUrl: publicUrl,
      },
    })

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      filePath: fileName,
    })
  } catch (error: any) {
    console.error('Error uploading profile image to Supabase Storage:', error)
    return NextResponse.json(
      { error: 'ファイルのアップロードに失敗しました', details: error.message },
      { status: 500 }
    )
  }
}
