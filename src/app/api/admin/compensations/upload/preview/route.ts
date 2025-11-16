import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'

/**
 * 報酬サマリーCSVのプレビュー
 * POST /api/admin/compensations/upload/preview
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
    const requiredColumns = ['userId', 'month', 'totalAmount', 'baseAmount', 'bonusAmount', 'contractCount']
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

    // 既存の報酬データを取得
    const existingCompensations = await prisma.compensation.findMany({
      select: { userId: true, month: true }
    })
    const existingMap = new Set(
      existingCompensations.map(c => `${c.userId}:${c.month}`)
    )

    // 各行を処理
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // ヘッダー行を考慮

      try {
        const userId = String(row.userId).trim()
        const month = String(row.month).trim()
        const totalAmount = parseInt(row.totalAmount)
        const baseAmount = parseInt(row.baseAmount)
        const bonusAmount = parseInt(row.bonusAmount)
        const contractCount = parseInt(row.contractCount)

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

        if (!/^\d{4}-\d{2}$/.test(month)) {
          preview.errors.push({
            rowNumber,
            error: `対象年月の形式が不正です（YYYY-MM形式で入力してください）: ${month}`,
            row
          })
          continue
        }

        if (isNaN(totalAmount) || isNaN(baseAmount) || isNaN(bonusAmount) || isNaN(contractCount)) {
          preview.errors.push({
            rowNumber,
            error: '金額または契約件数が数値ではありません',
            row
          })
          continue
        }

        const user = userMap.get(userId)!
        const key = `${userId}:${month}`
        const isUpdate = existingMap.has(key)

        const compensationData = {
          userId,
          userName: user.name,
          userEmail: user.email,
          month,
          totalAmount,
          baseAmount,
          bonusAmount,
          contractCount,
        }

        if (isUpdate) {
          preview.toUpdate.push(compensationData)
        } else {
          preview.toAdd.push(compensationData)
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
    console.error('[COMPENSATION_CSV_PREVIEW_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'CSVプレビューの生成に失敗しました' },
      { status: 500 }
    )
  }
}
