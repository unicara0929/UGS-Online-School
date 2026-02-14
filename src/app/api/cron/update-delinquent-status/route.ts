import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * Cron Job: 毎日実行されるバッチ処理
 *
 * 実行内容:
 * 1. 長期滞納ステータス自動更新（PAST_DUE → DELINQUENT）
 *
 * このエンドポイントは以下の方法で定期実行できます：
 * 1. Vercel Cron Jobs (vercel.json で設定)
 * 2. 外部のcronサービス (cron-job.org, EasyCron など)
 * 3. GitHub Actions (scheduled workflow)
 *
 * セキュリティ: CRON_SECRET環境変数で認証
 */
export async function GET(request: NextRequest) {
  try {
    // セキュリティチェック: CRON_SECRET で認証
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 7日前の日時を計算
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // PAST_DUE状態が7日以上続いているユーザーを取得
    const usersToUpdate = await prisma.user.findMany({
      where: {
        membershipStatus: 'PAST_DUE',
        delinquentSince: {
          lte: sevenDaysAgo // 7日以上前にPAST_DUEになった
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        delinquentSince: true,
      }
    })

    if (usersToUpdate.length === 0) {
      console.log('No users to update to DELINQUENT status')
      return NextResponse.json({
        success: true,
        message: 'No users to update',
        updatedCount: 0,
      })
    }

    // ユーザーをDELINQUENTステータスに更新
    const updateResults = await Promise.all(
      usersToUpdate.map(async (user) => {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              membershipStatus: 'DELINQUENT',
              membershipStatusChangedAt: new Date(),
              membershipStatusReason: '7日間の支払い遅延により長期滞納状態に移行',
            }
          })

          console.log(`Updated user ${user.email} to DELINQUENT status`)

          // TODO: 長期滞納通知メールを送信
          // await sendDelinquentNotificationEmail({
          //   to: user.email,
          //   userName: user.name,
          // })

          return { success: true, userId: user.id, email: user.email }
        } catch (error) {
          console.error(`Failed to update user ${user.email}:`, error)
          return { success: false, userId: user.id, email: user.email, error }
        }
      })
    )

    const successCount = updateResults.filter(r => r.success).length
    const failureCount = updateResults.filter(r => !r.success).length

    console.log(`DELINQUENT status update completed: ${successCount} success, ${failureCount} failed`)

    return NextResponse.json({
      success: true,
      delinquentUpdate: {
        message: 'DELINQUENT status update completed',
        updatedCount: successCount,
        failedCount: failureCount,
        details: updateResults,
      },
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST method for manual execution (admin only)
 */
export async function POST(request: NextRequest) {
  // 管理者のみ手動実行可能
  const { user: authUser, error: authError } = await getAuthenticatedUser(request)
  if (authError) return authError

  const { error: adminError } = checkAdmin(authUser!.role)
  if (adminError) return adminError

  // 管理者認証済みなので、CRON_SECRETチェックをスキップするため
  // 新しいリクエストを作成してAuthorizationヘッダーを設定
  const modifiedRequest = new NextRequest(request.url, {
    headers: {
      ...Object.fromEntries(request.headers),
      'authorization': `Bearer ${process.env.CRON_SECRET}`
    }
  })

  return GET(modifiedRequest)
}
