import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'

/**
 * 報酬サマリーCSVのプレビュー
 * POST /api/admin/compensations/upload/preview
 *
 * CSVカラム: 会員番号, 対象月, 税込報酬, 源泉徴収額, 振込手数料
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
    const requiredColumns = ['会員番号', '対象月', '税込報酬', '源泉徴収額', '振込手数料']
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

    // 全ユーザーをmemberIdで検索
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, memberId: true }
    })
    const memberIdMap = new Map(allUsers.map(u => [u.memberId, u]))

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
        const memberId = String(row['会員番号']).trim()
        const month = String(row['対象月']).trim()
        // 数値パース: カンマ・スペース・円記号を除去してからパース
        const parseNum = (v: any) => parseInt(String(v).replace(/[,\s¥￥]/g, ''))
        const grossAmount = parseNum(row['税込報酬'])
        const withholdingTax = parseNum(row['源泉徴収額'])
        const transferFee = parseNum(row['振込手数料'])

        // バリデーション
        if (!memberId) {
          preview.errors.push({ rowNumber, error: '会員番号が空です', row })
          continue
        }

        const user = memberIdMap.get(memberId)
        if (!user) {
          preview.errors.push({ rowNumber, error: `会員番号 ${memberId} のユーザーが見つかりません`, row })
          continue
        }

        if (!/^\d{4}-\d{2}$/.test(month)) {
          preview.errors.push({ rowNumber, error: `対象月の形式が不正です（YYYY-MM形式で入力してください）: ${month}`, row })
          continue
        }

        if (isNaN(grossAmount)) {
          preview.errors.push({ rowNumber, error: '税込報酬が数値ではありません', row })
          continue
        }

        if (isNaN(withholdingTax)) {
          preview.errors.push({ rowNumber, error: '源泉徴収額が数値ではありません', row })
          continue
        }

        if (isNaN(transferFee)) {
          preview.errors.push({ rowNumber, error: '振込手数料が数値ではありません', row })
          continue
        }

        if (withholdingTax < 0) {
          preview.errors.push({ rowNumber, error: '源泉徴収額は0以上の値にしてください', row })
          continue
        }

        if (transferFee < 0) {
          preview.errors.push({ rowNumber, error: '振込手数料は0以上の値にしてください', row })
          continue
        }

        if (withholdingTax + transferFee > grossAmount) {
          preview.errors.push({ rowNumber, error: `源泉徴収額+振込手数料が税込報酬を超えています（税込: ${grossAmount}, 源泉: ${withholdingTax}, 手数料: ${transferFee}）`, row })
          continue
        }

        const key = `${user.id}:${month}`
        const isUpdate = existingMap.has(key)
        const netAmount = grossAmount - withholdingTax - transferFee

        const compensationData = {
          memberId,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          month,
          grossAmount,
          withholdingTax,
          transferFee,
          netAmount,
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
