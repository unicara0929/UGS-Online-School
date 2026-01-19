import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@prisma/client'

/**
 * Cron Job: 毎月1日 0:00 (JST)
 *
 * 前月の全体MTGで finalApproval = 'DEMOTED' のユーザーを
 * FP → MEMBER にロール変更
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

    // 前月の全体MTGイベントを取得
    const now = new Date()
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // 前月の全体MTGイベント（isRecurring=true）を取得
    // スケジュールの日付で検索
    const lastMonthSchedules = await prisma.eventSchedule.findMany({
      where: {
        date: {
          gte: firstDayOfLastMonth,
          lt: firstDayOfCurrentMonth,
        },
        event: {
          isRecurring: true,
        },
      },
      select: {
        event: {
          select: {
            id: true,
            title: true,
          }
        },
        date: true,
      },
    })

    // 重複を除いてイベントリストを作成
    const eventMap = new Map<string, { id: string; title: string; date: Date }>()
    lastMonthSchedules.forEach(s => {
      if (!eventMap.has(s.event.id)) {
        eventMap.set(s.event.id, { id: s.event.id, title: s.event.title, date: s.date })
      }
    })
    const lastMonthMtgEvents = Array.from(eventMap.values())

    if (lastMonthMtgEvents.length === 0) {
      console.log('[DEMOTE_FP_CRON] No MTG events found for last month')
      return NextResponse.json({
        success: true,
        message: 'No MTG events found for last month',
        demotedCount: 0,
      })
    }

    const eventIds = lastMonthMtgEvents.map(e => e.id)
    console.log(`[DEMOTE_FP_CRON] Found ${eventIds.length} MTG events for last month`)

    // finalApproval = 'DEMOTED' の登録を取得
    const demotedRegistrations = await prisma.eventRegistration.findMany({
      where: {
        eventId: { in: eventIds },
        finalApproval: 'DEMOTED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        event: {
          select: {
            title: true,
          },
        },
      },
    })

    if (demotedRegistrations.length === 0) {
      console.log('[DEMOTE_FP_CRON] No users marked for demotion')
      return NextResponse.json({
        success: true,
        message: 'No users marked for demotion',
        demotedCount: 0,
      })
    }

    console.log(`[DEMOTE_FP_CRON] Found ${demotedRegistrations.length} users marked for demotion`)

    // 各ユーザーを降格処理
    const results = await Promise.all(
      demotedRegistrations.map(async (reg) => {
        const user = reg.user

        // すでにMEMBER以下の場合はスキップ
        if (user.role === UserRole.MEMBER) {
          return { success: true, userId: user.id, email: user.email, skipped: true, reason: 'Already MEMBER' }
        }

        try {
          // 1. ロールをMEMBERに変更
          await prisma.user.update({
            where: { id: user.id },
            data: {
              role: UserRole.MEMBER,
              // FPエイドに再昇格する場合のためにリセット
              complianceTestPassed: false,
              complianceTestPassedAt: null,
              fpOnboardingCompleted: false,
              fpOnboardingCompletedAt: null,
            },
          })

          // 2. RoleChangeHistoryに記録
          await prisma.roleChangeHistory.create({
            data: {
              userId: user.id,
              fromRole: user.role,
              toRole: UserRole.MEMBER,
              reason: `全体MTG不参加による自動降格（${reg.event.title}）`,
              changedBy: 'SYSTEM',
              changedByName: 'システム（自動処理）',
            },
          })

          // 3. 関連データのクリーンアップ
          await prisma.fPPromotionApplication.deleteMany({
            where: { userId: user.id },
          })

          await prisma.lPMeeting.deleteMany({
            where: { memberId: user.id },
          })

          // 4. Supabaseのメタデータも更新
          try {
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
              user_metadata: { role: UserRole.MEMBER },
            })
          } catch (supabaseError) {
            console.warn(`[DEMOTE_FP_CRON] Supabase metadata update failed for ${user.email}:`, supabaseError)
          }

          console.log(`[DEMOTE_FP_CRON] Successfully demoted user: ${user.email}`)
          return { success: true, userId: user.id, email: user.email }
        } catch (error) {
          console.error(`[DEMOTE_FP_CRON] Failed to demote user ${user.email}:`, error)
          return { success: false, userId: user.id, email: user.email, error: String(error) }
        }
      })
    )

    const successCount = results.filter(r => r.success && !r.skipped).length
    const skippedCount = results.filter(r => r.skipped).length
    const failedCount = results.filter(r => !r.success).length

    console.log(`[DEMOTE_FP_CRON] Completed: ${successCount} demoted, ${skippedCount} skipped, ${failedCount} failed`)

    return NextResponse.json({
      success: true,
      message: 'FP demotion cron job completed',
      demotedCount: successCount,
      skippedCount,
      failedCount,
      details: results,
    })
  } catch (error) {
    console.error('[DEMOTE_FP_CRON] Cron job error:', error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST method for manual execution (admin only)
 */
export async function POST(request: NextRequest) {
  // 管理者認証のみの場合、CRON_SECRETをスキップ
  const modifiedRequest = new NextRequest(request.url, {
    headers: {
      ...Object.fromEntries(request.headers),
      authorization: `Bearer ${process.env.CRON_SECRET || 'admin-manual-execution'}`,
    },
  })

  return GET(modifiedRequest)
}
