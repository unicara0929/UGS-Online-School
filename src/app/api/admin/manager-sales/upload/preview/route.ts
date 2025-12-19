import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'

/**
 * MGR売上CSVのプレビュー
 * POST /api/admin/manager-sales/upload/preview
 *
 * CSVフォーマット:
 * memberId,month,salesAmount,insuredCount
 * UGS0000001,2025-01,1500000,15
 * UGS0000001,2025-02,2000000,20
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
    const requiredColumns = ['memberId', 'month', 'salesAmount', 'insuredCount']
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
      locked: [] as any[],
      errors: [] as any[],
    }

    // 会員番号 → ユーザーマッピング
    const allUsers = await prisma.user.findMany({
      where: {
        role: { in: ['FP', 'MANAGER'] } // FPエイドまたはMGRのみ対象
      },
      select: { id: true, memberId: true, name: true, email: true, role: true }
    })
    const memberIdToUser = new Map(allUsers.map(u => [u.memberId, u]))

    // 既存の売上データを取得
    const existingSales = await prisma.managerMonthlySales.findMany({
      select: { userId: true, month: true, isLocked: true }
    })
    const existingMap = new Map(
      existingSales.map(s => [`${s.userId}:${s.month}`, s])
    )

    // 各行を処理
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // ヘッダー行を考慮

      try {
        const memberId = String(row.memberId).trim()
        const month = String(row.month).trim()
        const salesAmount = parseInt(row.salesAmount)
        const insuredCount = parseInt(row.insuredCount)

        // バリデーション
        if (!memberId) {
          preview.errors.push({
            rowNumber,
            error: '会員番号が空です',
            row
          })
          continue
        }

        const user = memberIdToUser.get(memberId)
        if (!user) {
          preview.errors.push({
            rowNumber,
            error: `会員番号 ${memberId} が存在しないか、FPエイド/MGR以外のユーザーです`,
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

        if (isNaN(salesAmount) || salesAmount < 0) {
          preview.errors.push({
            rowNumber,
            error: `売上金額が不正です: ${row.salesAmount}`,
            row
          })
          continue
        }

        if (isNaN(insuredCount) || insuredCount < 0) {
          preview.errors.push({
            rowNumber,
            error: `被保険者数が不正です: ${row.insuredCount}`,
            row
          })
          continue
        }

        const key = `${user.id}:${month}`
        const existing = existingMap.get(key)

        const salesData = {
          userId: user.id,
          memberId,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          month,
          salesAmount,
          insuredCount,
        }

        if (existing) {
          if (existing.isLocked) {
            // ロック済みのデータは更新不可
            preview.locked.push({
              ...salesData,
              message: 'この月のデータはロック済みのため更新できません'
            })
          } else {
            preview.toUpdate.push(salesData)
          }
        } else {
          preview.toAdd.push(salesData)
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
        lockedCount: preview.locked.length,
        errorCount: preview.errors.length,
        toAdd: preview.toAdd,
        toUpdate: preview.toUpdate,
        locked: preview.locked,
        errors: preview.errors,
      }
    })
  } catch (error) {
    console.error('[MANAGER_SALES_CSV_PREVIEW_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'CSVプレビューの生成に失敗しました' },
      { status: 500 }
    )
  }
}
