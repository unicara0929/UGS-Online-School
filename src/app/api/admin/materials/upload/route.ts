import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    // FormDataからファイルを取得
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが選択されていません' },
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
    const fileExtension = file.name.split('.').pop()

    // ストレージに保存するファイル名は英数字のみ（日本語などの特殊文字を避ける）
    // nanoidでユニークなIDを生成し、拡張子を追加
    const safeFileName = `${nanoid()}.${fileExtension}`

    // ファイルをSupabase Storageにアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('materials')
      .upload(safeFileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: `ファイルのアップロードに失敗しました: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // 公開URLを取得
    const { data: publicUrlData } = supabase.storage
      .from('materials')
      .getPublicUrl(safeFileName)

    const fileUrl = publicUrlData.publicUrl

    // ファイルサイズを計算（MBまたはKB）
    const fileSizeInBytes = file.size
    let fileSizeStr = ''
    if (fileSizeInBytes >= 1024 * 1024) {
      fileSizeStr = `${(fileSizeInBytes / (1024 * 1024)).toFixed(2)}MB`
    } else if (fileSizeInBytes >= 1024) {
      fileSizeStr = `${(fileSizeInBytes / 1024).toFixed(2)}KB`
    } else {
      fileSizeStr = `${fileSizeInBytes}B`
    }

    // ファイルタイプを取得（拡張子から）
    const fileType = fileExtension?.toUpperCase() || 'FILE'

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: fileSizeStr,
      fileType,
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'ファイルのアップロードに失敗しました',
      },
      { status: 500 }
    )
  }
}
