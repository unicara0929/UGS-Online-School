import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

// ファイル名パターン: {会員番号}_{YYYY-MM}.pdf
const FILE_NAME_PATTERN = /^(UGS\d+)_(\d{4}-\d{2})\.pdf$/i

// 最大ファイルサイズ（10MB）
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * 支払明細書PDF一括アップロードAPI（管理者用）
 * POST /api/admin/compensations/payslips/upload
 */
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
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ファイルが選択されていません' },
        { status: 400 }
      )
    }

    // 全ユーザーをmemberIdで検索用にマップ作成
    const allUsers = await prisma.user.findMany({
      select: { id: true, memberId: true }
    })
    const memberIdMap = new Map(allUsers.map(u => [u.memberId.toUpperCase(), u]))

    const details: { memberId: string; month: string; status: string; error?: string }[] = []
    let success = 0
    let failed = 0
    let skipped = 0

    for (const file of files) {
      // ファイル名をパース
      const match = file.name.match(FILE_NAME_PATTERN)
      if (!match) {
        details.push({
          memberId: '',
          month: '',
          status: 'failed',
          error: `ファイル名の形式が不正です: ${file.name}`,
        })
        failed++
        continue
      }

      const memberId = match[1].toUpperCase()
      const month = match[2]

      // ファイルタイプチェック
      if (file.type !== 'application/pdf') {
        details.push({ memberId, month, status: 'failed', error: 'PDFファイルのみアップロード可能です' })
        failed++
        continue
      }

      // ファイルサイズチェック
      if (file.size > MAX_FILE_SIZE) {
        details.push({ memberId, month, status: 'failed', error: 'ファイルサイズは10MB以下にしてください' })
        failed++
        continue
      }

      // memberIdからuserIdを検索
      const user = memberIdMap.get(memberId)
      if (!user) {
        details.push({ memberId, month, status: 'failed', error: `会員番号 ${memberId} のユーザーが見つかりません` })
        failed++
        continue
      }

      // Compensationレコードを検索
      const compensation = await prisma.compensation.findUnique({
        where: { userId_month: { userId: user.id, month } },
      })

      if (!compensation) {
        details.push({ memberId, month, status: 'failed', error: `${memberId} の ${month} の報酬レコードが存在しません` })
        failed++
        continue
      }

      // Supabase Storageにアップロード
      const storagePath = `payslips/${user.id}/${month}.pdf`

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await supabaseAdmin.storage
        .from('compensation-payslips')
        .upload(storagePath, buffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.error('[PAYSLIP_UPLOAD_ERROR]', uploadError)
        details.push({ memberId, month, status: 'failed', error: 'ファイルのアップロードに失敗しました' })
        failed++
        continue
      }

      // CompensationレコードのpayslipPathを更新
      await prisma.compensation.update({
        where: { id: compensation.id },
        data: { payslipPath: storagePath },
      })

      details.push({ memberId, month, status: 'success' })
      success++
    }

    return NextResponse.json({
      success: true,
      result: {
        success,
        failed,
        skipped,
        details,
      },
    })
  } catch (error) {
    console.error('[PAYSLIP_UPLOAD_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '支払明細書のアップロードに失敗しました' },
      { status: 500 }
    )
  }
}
