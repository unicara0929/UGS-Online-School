import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'
import { parseExternalFormFields } from '@/lib/validations/event'

/**
 * イベント参加者CSVエクスポートAPI
 * 内部参加者と外部参加者の両方をエクスポート
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者またはマネージャーチェック（閲覧権限）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.MANAGER_AND_ABOVE)
    if (roleError) return roleError

    const { eventId } = await context.params

    // イベント情報を取得（内部参加者）
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        externalRegistrations: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // カスタムフィールド定義を取得（型安全）
    const { fields: formFields } = parseExternalFormFields(event.externalFormFields)
    const customFieldLabels = formFields.map(f => f.label)

    // CSVヘッダー
    const headers = [
      'ID',
      '参加者種別',
      '名前',
      'メールアドレス',
      '電話番号',
      'ロール',
      '支払いステータス',
      '支払い金額',
      '申込日時',
      '支払い日時',
      'キャンセル日時',
      'キャンセル理由',
      ...customFieldLabels,
    ]

    // 内部参加者のデータを生成
    const internalRows = event.registrations.map((reg) => [
      reg.id,
      '内部',
      reg.user.name,
      reg.user.email,
      '', // 内部参加者は電話番号なし
      reg.user.role,
      reg.paymentStatus,
      reg.paidAmount || '',
      new Date(reg.createdAt).toISOString(),
      reg.paidAt ? new Date(reg.paidAt).toISOString() : '',
      reg.canceledAt ? new Date(reg.canceledAt).toISOString() : '',
      reg.cancelReason || '',
      ...customFieldLabels.map(() => ''), // 内部参加者はカスタムフィールド空
    ])

    // 外部参加者のデータを生成
    const externalRows = event.externalRegistrations.map((reg) => {
      const answers = (reg.customFieldAnswers as Record<string, any> | null) || {}
      return [
        reg.id,
        '外部',
        reg.name,
        reg.email,
        reg.phone,
        'EXTERNAL',
        reg.paymentStatus,
        reg.paidAmount || '',
        new Date(reg.createdAt).toISOString(),
        reg.paidAt ? new Date(reg.paidAt).toISOString() : '',
        '', // 外部参加者はキャンセル日時なし
        '', // 外部参加者はキャンセル理由なし
        ...formFields.map(f => {
          const value = answers[f.id]
          if (value === undefined || value === null) return ''
          if (Array.isArray(value)) return value.join('; ')
          return String(value)
        }),
      ]
    })

    // 全てのデータを結合して日時順でソート
    const allRows = [...internalRows, ...externalRows].sort((a, b) => {
      const dateA = new Date(a[8] as string).getTime()
      const dateB = new Date(b[8] as string).getTime()
      return dateB - dateA
    })

    // CSVインジェクション対策: セル値の先頭が危険な文字の場合にプレフィックスを付与
    const sanitizeCsvCell = (value: string): string => {
      const escaped = String(value).replace(/"/g, '""')
      if (/^[=+\-@\t\r]/.test(escaped)) {
        return "'" + escaped
      }
      return escaped
    }

    // CSV文字列を生成
    const csvContent = [
      headers.map((h) => `"${sanitizeCsvCell(h)}"`).join(','),
      ...allRows.map((row) =>
        row.map((cell) => `"${sanitizeCsvCell(String(cell))}"`).join(',')
      ),
    ].join('\n')

    // BOM付きUTF-8でエンコード（Excelで正しく開くため）
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // ファイル名用の日付
    const dateStr = new Date().toISOString().slice(0, 10)
    const eventTitle = event.title.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '_')
    const filename = `event_participants_${eventTitle}_${dateStr}.csv`

    // CSVレスポンスを返す（RFC 5987形式でファイル名をエンコード）
    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json(
      { error: 'CSVエクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
