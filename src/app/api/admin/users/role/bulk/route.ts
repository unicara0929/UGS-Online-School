import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 一括ロール変更API
 * POST /api/admin/users/role/bulk
 *
 * Body:
 * - fromRole: 変更元ロール (例: 'MEMBER')
 * - toRole: 変更先ロール (例: 'FP')
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const { user: authUser, error: authError } = await getAuthenticatedUser(request)
  if (authError) return authError

  // 管理者権限チェック
  const { error: adminError } = checkAdmin(authUser!.role)
  if (adminError) return adminError

  try {
    const { fromRole, toRole } = await request.json()

    // バリデーション
    if (!fromRole || !toRole) {
      return NextResponse.json(
        { error: '変更元ロールと変更先ロールが必要です' },
        { status: 400 }
      )
    }

    const validRoles = ['MEMBER', 'FP', 'MANAGER', 'ADMIN']
    if (!validRoles.includes(fromRole) || !validRoles.includes(toRole)) {
      return NextResponse.json(
        { error: '無効なロールです' },
        { status: 400 }
      )
    }

    if (fromRole === toRole) {
      return NextResponse.json(
        { error: '変更元と変更先が同じです' },
        { status: 400 }
      )
    }

    // 対象ユーザーを取得
    const targetUsers = await prisma.user.findMany({
      where: { role: fromRole as UserRole },
      select: { id: true, email: true, name: true }
    })

    if (targetUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: '対象ユーザーがいません',
        updatedCount: 0
      })
    }

    // 管理者情報を取得
    const admin = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: { name: true }
    })

    const now = new Date()
    const isUpgradeToFP = toRole === 'FP' && fromRole === 'MEMBER'

    // 一括更新データを構築
    const updateData: Record<string, unknown> = {
      role: toRole as UserRole
    }

    // MEMBERからFPへの昇格の場合、オンボーディング完了フラグを設定
    if (isUpgradeToFP) {
      updateData.complianceTestPassed = true
      updateData.complianceTestPassedAt = now
      updateData.fpOnboardingCompleted = true
      updateData.fpOnboardingCompletedAt = now
      updateData.managerContactConfirmedAt = now
    }

    // Prismaで一括更新
    await prisma.user.updateMany({
      where: { role: fromRole as UserRole },
      data: updateData
    })

    // RoleChangeHistoryに一括記録
    const historyRecords = targetUsers.map(user => ({
      userId: user.id,
      fromRole: fromRole as UserRole,
      toRole: toRole as UserRole,
      reason: `管理者による一括ロール変更（${fromRole} → ${toRole}）`,
      changedBy: authUser!.id,
      changedByName: admin?.name ?? '管理者',
    }))

    await prisma.roleChangeHistory.createMany({
      data: historyRecords
    })

    // Supabaseのメタデータも一括更新
    let supabaseSuccessCount = 0
    let supabaseFailCount = 0

    for (const user of targetUsers) {
      try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: { role: toRole }
        })
        if (error) {
          console.error(`Supabase update failed for ${user.email}:`, error)
          supabaseFailCount++
        } else {
          supabaseSuccessCount++
        }
      } catch (err) {
        console.error(`Supabase update error for ${user.email}:`, err)
        supabaseFailCount++
      }
    }

    console.log(`[BULK_ROLE_CHANGE] Updated ${targetUsers.length} users from ${fromRole} to ${toRole}`)
    console.log(`[BULK_ROLE_CHANGE] Supabase: ${supabaseSuccessCount} success, ${supabaseFailCount} failed`)

    return NextResponse.json({
      success: true,
      message: `${targetUsers.length}名のロールを ${fromRole} から ${toRole} に変更しました`,
      updatedCount: targetUsers.length,
      supabaseSuccess: supabaseSuccessCount,
      supabaseFailed: supabaseFailCount
    })
  } catch (error) {
    console.error('[BULK_ROLE_CHANGE] Error:', error)
    return NextResponse.json(
      { error: '一括ロール変更に失敗しました' },
      { status: 500 }
    )
  }
}
