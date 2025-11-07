import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    // 認証チェック（簡易版 - 実際にはSupabaseのセッションを使用）
    // TODO: 適切な認証を実装
    // ユーザーが存在するか確認
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'ファイルとユーザーIDが必要です' },
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'JPEG、PNG、PDFファイルのみアップロード可能です' },
        { status: 400 }
      )
    }

    // ファイルをバッファに読み込む
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // ファイル名を生成（ユーザーID_タイムスタンプ_元のファイル名）
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${userId}/${timestamp}_${sanitizedFileName}`

    // Supabase Storageにアップロード
    const bucketName = 'id-documents' // バケット名（後で作成が必要）
    
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false, // 既存ファイルを上書きしない
      })

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError)
      
      // バケットが見つからない場合の特別なエラーメッセージ
      const errorMessage = uploadError.message || ''
      const errorStatus = (uploadError as any).status || (uploadError as any).statusCode
      
      if (errorMessage.includes('Bucket not found') || errorStatus === 404 || errorStatus === '404') {
        return NextResponse.json(
          { 
            error: 'ストレージバケットが設定されていません',
            details: 'Supabaseダッシュボードで「id-documents」という名前のバケットを作成してください。詳細はREADME-SUPABASE-STORAGE.mdを参照してください。',
            errorCode: 'BUCKET_NOT_FOUND'
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: 'ファイルのアップロードに失敗しました', details: errorMessage },
        { status: 500 }
      )
    }

    // 署名付きURLを生成（1時間有効）
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(fileName, 3600) // 1時間

    if (urlError || !urlData) {
      console.error('Signed URL generation error:', urlError)
      return NextResponse.json(
        { error: 'ファイルURLの生成に失敗しました', details: urlError?.message },
        { status: 500 }
      )
    }

    // パブリックURL（RLSポリシーで保護されている場合）
    const publicUrl = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fileName).data.publicUrl

    // データベースに保存（FPPromotionApplicationのidDocumentUrlを更新）
    // 署名付きURLではなく、ファイルパスを保存（必要に応じて署名付きURLを生成）
    await prisma.fPPromotionApplication.upsert({
      where: { userId },
      update: {
        idDocumentUrl: fileName, // ファイルパスを保存
      },
      create: {
        userId,
        idDocumentUrl: fileName,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      fileUrl: urlData.signedUrl, // 署名付きURLを返す
      filePath: fileName, // ファイルパスも返す
      publicUrl: publicUrl, // パブリックURL（RLSで保護されている場合）
    })
  } catch (error: any) {
    console.error('Error uploading file to Supabase Storage:', error)
    return NextResponse.json(
      { error: 'ファイルのアップロードに失敗しました', details: error.message },
      { status: 500 }
    )
  }
}

