import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * ユーザーデータCSVエクスポートAPI
 * 管理者がユーザー一覧をCSV形式でダウンロードできる
 * クエリパラメータでフィルター可能
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック（MANAGER以上）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.MANAGER_AND_ABOVE)
    if (roleError) return roleError

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'
    const membershipStatusFilter = searchParams.get('membershipStatus') || 'all'
    const roleFilter = searchParams.get('role') || 'all'

    // 登録済みユーザー一覧を取得
    const users = await prisma.user.findMany({
      include: {
        subscriptions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 仮登録ユーザー一覧を取得
    const pendingUsers = await prisma.pendingUser.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // すべてのユーザーを統合
    type CombinedUser = {
      id: string
      memberId: string | null
      name: string
      email: string
      role: string
      membershipStatus: string
      membershipStatusChangedAt: Date | null
      membershipStatusReason: string | null
      createdAt: Date
      canceledAt: Date | null
      cancellationReason: string | null
      delinquentSince: Date | null
      stripeCustomerId: string | null
      stripeSubscriptionId: string | null
      subscriptionStatus: string | null
      userType: 'registered' | 'pending'
    }

    const allUsers: CombinedUser[] = [
      // 仮登録ユーザー
      ...pendingUsers.map(pending => ({
        id: pending.id,
        memberId: null,
        name: pending.name,
        email: pending.email,
        role: 'PENDING',
        membershipStatus: 'PENDING',
        membershipStatusChangedAt: null,
        membershipStatusReason: null,
        createdAt: pending.createdAt,
        canceledAt: null,
        cancellationReason: null,
        delinquentSince: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        userType: 'pending' as const,
      })),
      // 登録済みユーザー
      ...users.map(user => {
        const subscription = user.subscriptions?.[0]
        return {
          id: user.id,
          memberId: user.memberId,
          name: user.name,
          email: user.email,
          role: user.role,
          membershipStatus: user.membershipStatus,
          membershipStatusChangedAt: user.membershipStatusChangedAt,
          membershipStatusReason: user.membershipStatusReason,
          createdAt: user.createdAt,
          canceledAt: user.canceledAt,
          cancellationReason: user.cancellationReason,
          delinquentSince: user.delinquentSince,
          stripeCustomerId: subscription?.stripeCustomerId || null,
          stripeSubscriptionId: subscription?.stripeSubscriptionId || null,
          subscriptionStatus: subscription?.status || null,
          userType: 'registered' as const,
        }
      })
    ]

    // フィルター適用
    let filteredUsers = allUsers

    // 決済ステータスフィルター
    if (statusFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => {
        if (statusFilter === 'pending') {
          return user.userType === 'pending'
        }
        if (statusFilter === 'active') {
          return user.subscriptionStatus === 'active'
        }
        if (statusFilter === 'canceled') {
          return user.subscriptionStatus === 'canceled'
        }
        if (statusFilter === 'past_due') {
          return user.subscriptionStatus === 'past_due'
        }
        if (statusFilter === 'unpaid') {
          return user.subscriptionStatus === 'unpaid' || !user.subscriptionStatus
        }
        return true
      })
    }

    // 会員ステータスフィルター
    if (membershipStatusFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.membershipStatus === membershipStatusFilter)
    }

    // ロールフィルター
    if (roleFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.role === roleFilter)
    }

    // CSVヘッダー
    const headers = [
      'ID',
      '会員番号',
      '名前',
      'メールアドレス',
      'ロール',
      '会員ステータス',
      'ステータス変更日時',
      'ステータス変更理由',
      '登録日',
      '退会日',
      '退会理由',
      '滞納開始日',
      'StripeカスタマーID',
      'StripeサブスクリプションID',
      'サブスクリプションステータス',
      'ユーザー種別'
    ]

    // CSVデータを生成
    const rows = filteredUsers.map(user => {
      return [
        user.id,
        user.memberId || '',
        user.name,
        user.email,
        user.role,
        user.membershipStatus,
        user.membershipStatusChangedAt ? new Date(user.membershipStatusChangedAt).toISOString() : '',
        user.membershipStatusReason || '',
        new Date(user.createdAt).toISOString(),
        user.canceledAt ? new Date(user.canceledAt).toISOString() : '',
        user.cancellationReason || '',
        user.delinquentSince ? new Date(user.delinquentSince).toISOString() : '',
        user.stripeCustomerId || '',
        user.stripeSubscriptionId || '',
        user.subscriptionStatus || '',
        user.userType === 'pending' ? '仮登録' : '正式登録'
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
