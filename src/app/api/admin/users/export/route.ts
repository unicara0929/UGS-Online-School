import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * ユーザーデータCSVエクスポートAPI
 * 管理者がユーザー一覧をCSV形式でダウンロードできる
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック（MANAGER以上）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.MANAGER_AND_ABOVE)
    if (roleError) return roleError

    // ユーザー一覧を取得
    const users = await prisma.user.findMany({
      include: {
        subscriptions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // CSVヘッダー
    const headers = [
      'ID',
      '名前',
      'メールアドレス',
      'ロール',
      '会員ステータス',
      'ステータス変更日時',
      'ステータス変更理由',
      '登録日',
      '休会開始日',
      '休会終了日',
      '退会日',
      '退会理由',
      '滞納開始日',
      'StripeカスタマーID',
      'StripeサブスクリプションID',
      'サブスクリプションステータス'
    ]

    // CSVデータを生成
    const rows = users.map(user => {
      const subscription = user.subscriptions?.[0]
      return [
        user.id,
        user.name,
        user.email,
        user.role,
        user.membershipStatus,
        user.membershipStatusChangedAt ? new Date(user.membershipStatusChangedAt).toISOString() : '',
        user.membershipStatusReason || '',
        new Date(user.createdAt).toISOString(),
        user.suspensionStartDate ? new Date(user.suspensionStartDate).toISOString() : '',
        user.suspensionEndDate ? new Date(user.suspensionEndDate).toISOString() : '',
        user.canceledAt ? new Date(user.canceledAt).toISOString() : '',
        user.cancellationReason || '',
        user.delinquentSince ? new Date(user.delinquentSince).toISOString() : '',
        subscription?.stripeCustomerId || '',
        subscription?.stripeSubscriptionId || '',
        subscription?.status || ''
      ]
    })

    // CSV文字列を生成
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // BOM付きUTF-8でエンコード（Excelで正しく開くため）
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // CSVレスポンスを返す
    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="users_export_${new Date().toISOString().slice(0, 10)}.csv"`,
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
