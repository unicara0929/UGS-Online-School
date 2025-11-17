import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * 一括会員ステータス変更 API
 * 管理者が複数ユーザーの会員ステータスを一括で変更
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 管理者権限チェック
    const adminUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { role: true }
    })

    if (!adminUser || (adminUser.role !== 'ADMIN' && adminUser.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userIds, membershipStatus, reason } = body

    // バリデーション
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'ユーザーIDを指定してください' },
        { status: 400 }
      )
    }

    if (!membershipStatus) {
      return NextResponse.json(
        { error: '変更後のステータスを指定してください' },
        { status: 400 }
      )
    }

    const validStatuses = ['PENDING', 'ACTIVE', 'SUSPENDED', 'PAST_DUE', 'DELINQUENT', 'CANCELED', 'TERMINATED', 'EXPIRED']
    if (!validStatuses.includes(membershipStatus)) {
      return NextResponse.json(
        { error: '無効なステータスです' },
        { status: 400 }
      )
    }

    // 一括更新を実行
    const updateResults = await Promise.all(
      userIds.map(async (userId: string) => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true, membershipStatus: true }
          })

          if (!user) {
            return {
              success: false,
              userId,
              error: 'ユーザーが見つかりません'
            }
          }

          await prisma.user.update({
            where: { id: userId },
            data: {
              membershipStatus,
              membershipStatusChangedAt: new Date(),
              membershipStatusReason: reason || `管理者による一括ステータス変更 (${authUser.email})`,
              membershipStatusChangedBy: authUser.email,
              // ステータスに応じた追加フィールドの更新
              ...(membershipStatus === 'TERMINATED' && {
                canceledAt: new Date(),
                cancellationReason: reason || '管理者による強制解約',
              }),
              ...(membershipStatus === 'ACTIVE' && {
                reactivatedAt: new Date(),
                suspensionStartDate: null,
                suspensionEndDate: null,
                delinquentSince: null,
              }),
            }
          })

          console.log(`Updated user ${user.email} membership status to ${membershipStatus}`)

          return {
            success: true,
            userId,
            email: user.email,
            oldStatus: user.membershipStatus,
            newStatus: membershipStatus,
          }
        } catch (error) {
          console.error(`Failed to update user ${userId}:`, error)
          return {
            success: false,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )

    const successCount = updateResults.filter(r => r.success).length
    const failedCount = updateResults.filter(r => !r.success).length

    console.log(`Bulk membership status update: ${successCount} success, ${failedCount} failed`)

    return NextResponse.json({
      success: true,
      message: `${successCount}件のユーザーステータスを更新しました`,
      total: userIds.length,
      successCount,
      failedCount,
      details: updateResults,
    })
  } catch (error) {
    console.error('Bulk membership status update error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
