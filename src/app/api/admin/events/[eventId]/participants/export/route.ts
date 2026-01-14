import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * イベント参加者CSVエクスポートAPI
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

    // イベント情報を取得
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
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // CSVヘッダー
    const headers = [
      'ID',
      '名前',
      'メールアドレス',
      'ロール',
      '支払いステータス',
      '支払い金額',
      '申込日時',
      '支払い日時',
      'キャンセル日時',
      'キャンセル理由',
    ]

    // CSVデータを生成
    const rows = event.registrations.map((reg) => [
      reg.id,
      reg.user.name,
      reg.user.email,
      reg.user.role,
      reg.paymentStatus,
      reg.paidAmount || '',
      new Date(reg.createdAt).toISOString(),
      reg.paidAt ? new Date(reg.paidAt).toISOString() : '',
      reg.canceledAt ? new Date(reg.canceledAt).toISOString() : '',
      reg.cancelReason || '',
    ])

    // CSV文字列を生成
    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    // BOM付きUTF-8でエンコード（Excelで正しく開くため）
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // ファイル名用の日付
    const dateStr = new Date().toISOString().slice(0, 10)
    const eventTitle = event.title.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '_')

    // CSVレスポンスを返す
    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="event_participants_${eventTitle}_${dateStr}.csv"`,
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
