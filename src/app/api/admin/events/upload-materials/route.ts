import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 全体MTG資料PDFアップロードAPI（管理者用）
 * POST /api/admin/events/upload-materials
 *
 * イベント終了後に資料PDFをアップロードするAPI
 */

// アップロード可能なファイルタイプ
const ALLOWED_TYPES = [
  'application/pdf',
]

// 最大ファイルサイズ（20MB）
const MAX_FILE_SIZE = 20 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    // FormDataを取得
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const eventId = formData.get('eventId') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが選択されていません' },
        { status: 400 }
      )
    }

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'イベントIDが必要です' },
        { status: 400 }
      )
    }

    // ファイルタイプチェック
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'PDFファイルのみアップロード可能です' },
        { status: 400 }
      )
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'ファイルサイズは20MB以下にしてください' },
        { status: 400 }
      )
    }

    // ファイル名を生成（タイムスタンプ + オリジナルファイル名）
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${eventId}/${timestamp}_${sanitizedFilename}`

    // Supabase Storage にアップロード
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('event-materials')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[UPLOAD_MATERIALS_ERROR]', uploadError)
      return NextResponse.json(
        { success: false, error: 'ファイルのアップロードに失敗しました' },
        { status: 500 }
      )
    }

    // 公開URLを取得
    const { data: urlData } = supabaseAdmin.storage
      .from('event-materials')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      message: '資料をアップロードしました',
      materialsUrl: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
    })
  } catch (error) {
    console.error('[UPLOAD_MATERIALS_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '資料のアップロードに失敗しました' },
      { status: 500 }
    )
  }
}
