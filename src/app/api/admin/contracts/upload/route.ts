import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'
import { ContractType, ContractStatus } from '@prisma/client'

/**
 * 契約CSVアップロード API
 * 管理者がCSVで契約データを一括アップロード
 *
 * CSV形式:
 * 会員番号,契約番号,契約種別,商品名,契約者名,契約金額,報酬額,契約日,メモ
 *
 * 契約種別の値:
 * - INSURANCE: 保険
 * - REAL_ESTATE: 不動産
 * - RENTAL: 賃貸
 * - SOLAR_BATTERY: 太陽光/蓄電池
 * - CAREER: 転職
 * - HOUSING: 住宅
 * - OTHER: その他
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'CSVファイルが必要です' },
        { status: 400 }
      )
    }

    // ファイル内容を読み取り
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'CSVファイルにデータがありません' },
        { status: 400 }
      )
    }

    // ヘッダー行をスキップ
    const dataLines = lines.slice(1)

    const results = {
      success: 0,
      errors: [] as { line: number; error: string }[],
      skipped: 0
    }

    // 契約種別のマッピング
    const contractTypeMap: Record<string, ContractType> = {
      '保険': 'INSURANCE',
      'INSURANCE': 'INSURANCE',
      '不動産': 'REAL_ESTATE',
      'REAL_ESTATE': 'REAL_ESTATE',
      '賃貸': 'RENTAL',
      'RENTAL': 'RENTAL',
      '太陽光': 'SOLAR_BATTERY',
      '蓄電池': 'SOLAR_BATTERY',
      '太陽光/蓄電池': 'SOLAR_BATTERY',
      'SOLAR_BATTERY': 'SOLAR_BATTERY',
      '転職': 'CAREER',
      'CAREER': 'CAREER',
      '住宅': 'HOUSING',
      'HOUSING': 'HOUSING',
      'その他': 'OTHER',
      'OTHER': 'OTHER'
    }

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]
      const lineNumber = i + 2 // ヘッダー行 + 1ベースインデックス

      try {
        // CSVパース（ダブルクォート対応）
        const columns = parseCSVLine(line)

        if (columns.length < 8) {
          results.errors.push({
            line: lineNumber,
            error: `列数が不足しています（${columns.length}列）。最低8列必要です。`
          })
          continue
        }

        const [
          memberId,
          contractNumber,
          contractTypeStr,
          productName,
          customerName,
          amountStr,
          rewardAmountStr,
          signedAtStr,
          note
        ] = columns

        // 会員番号からユーザーを検索
        if (!memberId?.trim()) {
          results.errors.push({
            line: lineNumber,
            error: '会員番号が空です'
          })
          continue
        }

        const user = await prisma.user.findUnique({
          where: { memberId: memberId.trim() },
          select: { id: true, role: true }
        })

        if (!user) {
          results.errors.push({
            line: lineNumber,
            error: `会員番号 ${memberId} のユーザーが見つかりません`
          })
          continue
        }

        // 契約番号チェック
        if (!contractNumber?.trim()) {
          results.errors.push({
            line: lineNumber,
            error: '契約番号が空です'
          })
          continue
        }

        // 契約種別のマッピング
        const contractType = contractTypeMap[contractTypeStr?.trim()] || 'OTHER'

        // 契約日のパース
        let signedAt: Date
        try {
          signedAt = parseDate(signedAtStr?.trim() || '')
        } catch {
          results.errors.push({
            line: lineNumber,
            error: `契約日の形式が不正です: ${signedAtStr}`
          })
          continue
        }

        // 金額のパース
        const amount = parseAmount(amountStr)
        const rewardAmount = parseAmount(rewardAmountStr)

        // 既存の契約をチェック（upsert）
        await prisma.contract.upsert({
          where: { contractNumber: contractNumber.trim() },
          update: {
            productName: productName?.trim() || null,
            contractType,
            customerName: customerName?.trim() || null,
            amount,
            rewardAmount,
            signedAt,
            note: note?.trim() || null,
            status: 'ACTIVE'
          },
          create: {
            userId: user.id,
            contractNumber: contractNumber.trim(),
            productName: productName?.trim() || null,
            contractType,
            customerName: customerName?.trim() || null,
            amount,
            rewardAmount,
            signedAt,
            note: note?.trim() || null,
            status: 'ACTIVE'
          }
        })

        results.success++
      } catch (error: any) {
        console.error(`Error processing line ${lineNumber}:`, error)
        results.errors.push({
          line: lineNumber,
          error: error.message || '処理中にエラーが発生しました'
        })
      }
    }

    console.log('[CONTRACT_CSV_UPLOAD]', {
      uploadedBy: authUser!.id,
      success: results.success,
      errors: results.errors.length,
      at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `${results.success}件の契約を処理しました`,
      results
    })
  } catch (error) {
    console.error('[CONTRACT_CSV_UPLOAD_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'CSVアップロードに失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * CSVの1行をパース（ダブルクォート対応）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたダブルクォート
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

/**
 * 日付文字列をパース
 * 対応形式: YYYY-MM-DD, YYYY/MM/DD, YYYYMMDD
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) {
    throw new Error('日付が空です')
  }

  // YYYY-MM-DD or YYYY/MM/DD
  let match = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (match) {
    const [, year, month, day] = match
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  // YYYYMMDD
  match = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (match) {
    const [, year, month, day] = match
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  throw new Error(`日付形式が不正です: ${dateStr}`)
}

/**
 * 金額文字列をパース
 * カンマ区切り、円記号対応
 */
function parseAmount(amountStr: string | undefined): number | null {
  if (!amountStr?.trim()) {
    return null
  }

  // カンマ、円記号、スペースを削除
  const cleaned = amountStr.replace(/[,¥￥\s]/g, '')

  const amount = parseInt(cleaned, 10)
  if (isNaN(amount)) {
    return null
  }

  return amount
}
