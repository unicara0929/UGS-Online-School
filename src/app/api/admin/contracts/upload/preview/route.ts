import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'

/**
 * 契約一覧CSVのプレビュー
 * POST /api/admin/contracts/upload/preview
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが選択されていません' },
        { status: 400 }
      )
    }

    // CSVファイルを読み込み
    const text = await file.text()

    // CSVをパース
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'CSVの形式が正しくありません', errors: parseResult.errors },
        { status: 400 }
      )
    }

    const rows = parseResult.data as any[]

    // 必須カラムのチェック
    const requiredColumns = ['userId', 'contractNumber', 'productName', 'amount', 'signedAt', 'status']
    const firstRow = rows[0] || {}
    const missingColumns = requiredColumns.filter(col => !(col in firstRow))

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `必須カラムが不足しています: ${missingColumns.join(', ')}`
        },
        { status: 400 }
      )
    }

    // プレビューデータを作成
    const preview = {
      toAdd: [] as any[],
      toUpdate: [] as any[],
      errors: [] as any[],
    }

    // 全ユーザーを取得
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    })
    const userMap = new Map(allUsers.map(u => [u.id, u]))

    // 既存の契約を取得
    const existingContracts = await prisma.contract.findMany({
      select: { contractNumber: true, userId: true }
    })
    const existingMap = new Map(
      existingContracts.map(c => [c.contractNumber, c])
    )

    // ステータスの有効値
    const validStatuses = ['ACTIVE', 'CANCELLED', 'EXPIRED']

    // 各行を処理
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // ヘッダー行を考慮

      try {
        const userId = String(row.userId).trim()
        const contractNumber = String(row.contractNumber).trim()
        const productName = String(row.productName).trim()
        const amount = parseInt(row.amount)
        const signedAt = String(row.signedAt).trim()
        const status = String(row.status).trim().toUpperCase()

        // バリデーション
        if (!userId) {
          preview.errors.push({
            rowNumber,
            error: 'ユーザーIDが空です',
            row
          })
          continue
        }

        if (!userMap.has(userId)) {
          preview.errors.push({
            rowNumber,
            error: `ユーザーID ${userId} が存在しません`,
            row
          })
          continue
        }

        if (!contractNumber) {
          preview.errors.push({
            rowNumber,
            error: '契約番号が空です',
            row
          })
          continue
        }

        if (!productName) {
          preview.errors.push({
            rowNumber,
            error: '商品名が空です',
            row
          })
          continue
        }

        if (isNaN(amount)) {
          preview.errors.push({
            rowNumber,
            error: '保険料が数値ではありません',
            row
          })
          continue
        }

        // 日付のバリデーション
        const signedAtDate = new Date(signedAt)
        if (isNaN(signedAtDate.getTime())) {
          preview.errors.push({
            rowNumber,
            error: `契約日の形式が不正です: ${signedAt}`,
            row
          })
          continue
        }

        if (!validStatuses.includes(status)) {
          preview.errors.push({
            rowNumber,
            error: `ステータスが不正です（ACTIVE/CANCELLED/EXPIREDのいずれか）: ${status}`,
            row
          })
          continue
        }

        const user = userMap.get(userId)!
        const existing = existingMap.get(contractNumber)
        const isUpdate = !!existing

        const contractData = {
          userId,
          userName: user.name,
          userEmail: user.email,
          contractNumber,
          productName,
          amount,
          signedAt,
          status,
        }

        if (isUpdate) {
          preview.toUpdate.push(contractData)
        } else {
          preview.toAdd.push(contractData)
        }
      } catch (error: any) {
        preview.errors.push({
          rowNumber,
          error: error.message || '予期しないエラー',
          row
        })
      }
    }

    return NextResponse.json({
      success: true,
      preview: {
        toAddCount: preview.toAdd.length,
        toUpdateCount: preview.toUpdate.length,
        errorCount: preview.errors.length,
        toAdd: preview.toAdd,
        toUpdate: preview.toUpdate,
        errors: preview.errors,
      }
    })
  } catch (error) {
    console.error('[CONTRACT_CSV_PREVIEW_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'CSVプレビューの生成に失敗しました' },
      { status: 500 }
    )
  }
}
