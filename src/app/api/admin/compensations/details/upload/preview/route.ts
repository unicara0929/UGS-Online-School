import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'

const REAL_ESTATE_COLUMNS = ['会員番号', '対象月', '番号', '紹介顧客', '成約物件', '契約日', '報酬額']
const INSURANCE_COLUMNS = ['会員番号', '対象月', '会社', 'タイプ', '保険種類', '契約者名', '手数料額']

/**
 * 報酬内訳CSVのプレビュー
 * POST /api/admin/compensations/details/upload/preview
 */
export async function POST(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const formData = await request.formData()
    const file = formData.get('file') as File
    const businessType = formData.get('businessType') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが選択されていません' },
        { status: 400 }
      )
    }

    if (!businessType || !['REAL_ESTATE', 'INSURANCE'].includes(businessType)) {
      return NextResponse.json(
        { success: false, error: '事業タイプが不正です' },
        { status: 400 }
      )
    }

    const text = await file.text()
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
    const requiredColumns = businessType === 'REAL_ESTATE' ? REAL_ESTATE_COLUMNS : INSURANCE_COLUMNS
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

    const preview = {
      toAdd: [] as any[],
      errors: [] as any[],
    }

    // 全ユーザーをmemberIdで検索
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, memberId: true }
    })
    const memberIdMap = new Map(allUsers.map(u => [u.memberId, u]))

    // 各行を処理
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2

      try {
        const memberId = String(row['会員番号']).trim()
        const month = String(row['対象月']).trim()

        // 会員番号バリデーション
        if (!memberId) {
          preview.errors.push({ rowNumber, error: '会員番号が空です', row })
          continue
        }

        const user = memberIdMap.get(memberId)
        if (!user) {
          preview.errors.push({ rowNumber, error: `会員番号 ${memberId} のユーザーが見つかりません`, row })
          continue
        }

        // 月形式チェック
        if (!/^\d{4}-\d{2}$/.test(month)) {
          preview.errors.push({ rowNumber, error: `対象月の形式が不正です（YYYY-MM形式で入力してください）: ${month}`, row })
          continue
        }

        if (businessType === 'REAL_ESTATE') {
          const amount = parseInt(row['報酬額'])
          if (isNaN(amount)) {
            preview.errors.push({ rowNumber, error: '報酬額が数値ではありません', row })
            continue
          }

          preview.toAdd.push({
            memberId,
            userId: user.id,
            userName: user.name,
            month,
            amount,
            businessType: 'REAL_ESTATE',
            details: {
              number: String(row['番号'] || '').trim(),
              customerName: String(row['紹介顧客'] || '').trim(),
              property: String(row['成約物件'] || '').trim(),
              contractDate: String(row['契約日'] || '').trim(),
            },
          })
        } else {
          const amount = parseInt(row['手数料額'])
          if (isNaN(amount)) {
            preview.errors.push({ rowNumber, error: '手数料額が数値ではありません', row })
            continue
          }

          preview.toAdd.push({
            memberId,
            userId: user.id,
            userName: user.name,
            month,
            amount,
            businessType: 'INSURANCE',
            details: {
              company: String(row['会社'] || '').trim(),
              type: String(row['タイプ'] || '').trim(),
              insuranceType: String(row['保険種類'] || '').trim(),
              contractorName: String(row['契約者名'] || '').trim(),
            },
          })
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
        errorCount: preview.errors.length,
        toAdd: preview.toAdd,
        errors: preview.errors,
      }
    })
  } catch (error) {
    console.error('[COMPENSATION_DETAIL_CSV_PREVIEW_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'CSVプレビューの生成に失敗しました' },
      { status: 500 }
    )
  }
}
