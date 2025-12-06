import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PromotionStatus, UserRole } from '@prisma/client'
import { createPromotionApprovedNotification } from '@/lib/services/notification-service'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 昇格申請を承認
 * POST /api/admin/promotions/[applicationId]/approve
 * 権限: 管理者のみ
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) {
      return adminError || NextResponse.json(
        { error: 'アクセス権限がありません。管理者権限が必要です。' },
        { status: 403 }
      )
    }

    const { applicationId } = await context.params
    const body = await request.json()
    const { reviewNotes } = body

    if (!applicationId) {
      return NextResponse.json(
        { error: '申請IDが必要です' },
        { status: 400 }
      )
    }

    // 申請を取得
    const application = await prisma.promotionApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            email: true
          }
        }
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: '申請が見つかりません' },
        { status: 404 }
      )
    }

    if (application.status !== PromotionStatus.PENDING) {
      return NextResponse.json(
        { error: 'この申請は既に処理済みです' },
        { status: 400 }
      )
    }

    // 申請を承認
    const updatedApplication = await prisma.promotionApplication.update({
      where: { id: applicationId },
      data: {
        status: PromotionStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: authUser!.id, // 認証済みユーザーのIDを使用
        reviewNotes: reviewNotes || null
      }
    })

    // FP昇格の場合は、オンボーディング完了までロール変更を保留
    // オンボーディング完了時に /api/fp-onboarding/complete でロールが変更される
    if (application.targetRole === UserRole.FP) {
      // FPPromotionApplicationを更新（ロールは変更しない）
      const fpApplication = await prisma.fPPromotionApplication.findUnique({
        where: { userId: application.userId }
      })

      if (fpApplication) {
        await prisma.fPPromotionApplication.update({
          where: { userId: application.userId },
          data: {
            status: 'APPROVED',
            approvedAt: new Date()
          }
        })
      }

      // オンボーディングフラグをリセット（これからオンボーディングを行う）
      await prisma.user.update({
        where: { id: application.userId },
        data: {
          fpOnboardingCompleted: false,
          complianceTestPassed: false,
          managerContactConfirmedAt: null
        }
      })
    } else {
      // FP以外の昇格（マネージャーなど）は即時ロール変更
      await prisma.user.update({
        where: { id: application.userId },
        data: {
          role: application.targetRole
        }
      })

      // Supabaseのユーザーロールも更新
      try {
        const supabaseUser = await supabaseAdmin.auth.admin.listUsers()
        const user = supabaseUser.data.users.find(u => u.email === application.user.email)

        if (user) {
          // ロール名をマッピング（PrismaのUserRole → Supabaseのuser_metadata）
          const roleMap: Record<string, string> = {
            'MEMBER': 'member',
            'FP': 'fp',
            'MANAGER': 'manager',
            'ADMIN': 'admin'
          }
          const supabaseRole = roleMap[application.targetRole] || 'member'

          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              role: supabaseRole
            }
          })
        }
      } catch (supabaseError) {
        console.error('Failed to update Supabase user role:', supabaseError)
        // Supabaseの更新に失敗しても処理は続行
      }
    }

    // 承認通知を送信
    try {
      const roleNameMap: Record<string, string> = {
        'FP': 'FPエイド',
        'MANAGER': 'マネージャー',
        'ADMIN': '管理者'
      }
      const roleName = roleNameMap[application.targetRole] || application.targetRole
      
      await createPromotionApprovedNotification(
        application.userId,
        roleName
      )
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError)
      // 通知の作成に失敗しても処理は続行
    }

    return NextResponse.json({
      success: true,
      application: {
        id: updatedApplication.id,
        userId: updatedApplication.userId,
        targetRole: updatedApplication.targetRole,
        status: updatedApplication.status,
        reviewedAt: updatedApplication.reviewedAt
      }
    })
  } catch (error) {
    console.error('Approve promotion error:', error)
    return NextResponse.json(
      { error: '昇格申請の承認に失敗しました' },
      { status: 500 }
    )
  }
}

