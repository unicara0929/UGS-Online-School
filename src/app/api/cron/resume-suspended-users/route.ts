import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * Cron Job: 休会期間終了ユーザーの自動再開
 *
 * SUSPENDED（休会中）状態で休会終了日を過ぎたユーザーを
 * 自動的にACTIVE（有効会員）に戻す
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

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()

    // SUSPENDED状態で休会終了日を過ぎたユーザーを取得
    const usersToResume = await prisma.user.findMany({
      where: {
        membershipStatus: 'SUSPENDED',
        suspensionEndDate: {
          lte: now // 現在時刻より前
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        suspensionEndDate: true,
        subscriptions: {
          select: {
            stripeSubscriptionId: true
          }
        }
      }
    })

    if (usersToResume.length === 0) {
      console.log('No suspended users to resume')
      return NextResponse.json({
        success: true,
        message: 'No users to resume',
        resumedCount: 0,
      })
    }

    // ユーザーを自動的に再開
    const resumeResults = await Promise.all(
      usersToResume.map(async (user) => {
        try {
          // Stripeサブスクリプションの一時停止を解除
          const subscription = user.subscriptions?.[0]
          if (subscription?.stripeSubscriptionId) {
            try {
              await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                pause_collection: null, // 一時停止を解除
              })
            } catch (stripeError) {
              console.error(`Failed to resume Stripe subscription for ${user.email}:`, stripeError)
              // Stripe側の解除に失敗してもデータベースは更新する
            }
          }

          // ユーザーステータスをACTIVEに更新
          await prisma.user.update({
            where: { id: user.id },
            data: {
              membershipStatus: 'ACTIVE',
              membershipStatusChangedAt: new Date(),
              membershipStatusReason: '休会期間終了により自動的に再開',
              reactivatedAt: new Date(),
              suspensionStartDate: null,
              suspensionEndDate: null,
            }
          })

          console.log(`Resumed user ${user.email} from suspension`)

          // TODO: 再開通知メールを送信
          // await sendSuspensionResumedEmail({
          //   to: user.email,
          //   userName: user.name,
          // })

          return { success: true, userId: user.id, email: user.email }
        } catch (error) {
          console.error(`Failed to resume user ${user.email}:`, error)
          return { success: false, userId: user.id, email: user.email, error }
        }
      })
    )

    const successCount = resumeResults.filter(r => r.success).length
    const failureCount = resumeResults.filter(r => !r.success).length

    console.log(`Suspension resume completed: ${successCount} success, ${failureCount} failed`)

    return NextResponse.json({
      success: true,
      message: 'Suspension resume completed',
      resumedCount: successCount,
      failedCount: failureCount,
      details: resumeResults,
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
      'authorization': `Bearer ${process.env.CRON_SECRET || 'admin-manual-execution'}`
    }
  })

  return GET(modifiedRequest)
}
