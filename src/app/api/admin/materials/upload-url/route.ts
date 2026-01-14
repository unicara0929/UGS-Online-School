import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { nanoid } from 'nanoid'

/**
 * 資料アップロード用の署名付きURLを生成
 * POST /api/admin/materials/upload-url
 *
 * フロントエンドから直接Supabaseにアップロードするための署名付きURLを返す
 * これによりNext.jsのbody size制限を回避できる
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const { fileName, fileType } = body

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'ファイル名が指定されていません' },
        { status: 400 }
      )
    }

    // Supabaseクライアントを作成
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^["]|["]$/g, '') || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/^["]|["]$/g, '') || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase設定が不正です' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 元のファイル名から拡張子を取得
    const fileExtension = fileName.split('.').pop()

    // ストレージに保存するファイル名は英数字のみ（日本語などの特殊文字を避ける）
    const safeFileName = `${nanoid()}.${fileExtension}`

    // 署名付きアップロードURLを生成（60分有効）
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('materials')
      .createSignedUploadUrl(safeFileName)

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError)
      return NextResponse.json(
        { success: false, error: 'アップロードURLの生成に失敗しました' },
        { status: 500 }
      )
    }

    // 公開URLを取得
    const { data: publicUrlData } = supabase.storage
      .from('materials')
      .getPublicUrl(safeFileName)

    return NextResponse.json({
      success: true,
      signedUrl: signedUrlData.signedUrl,
      token: signedUrlData.token,
      path: signedUrlData.path,
      publicUrl: publicUrlData.publicUrl,
      safeFileName,
    })
  } catch (error) {
    console.error('Upload URL API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'アップロードURLの生成に失敗しました',
      },
      { status: 500 }
    )
  }
}
