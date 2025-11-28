import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { appRoleToPrismaRole, stringToAppRole } from '@/lib/utils/role-mapper'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

export async function PUT(request: NextRequest) {
  // 認証チェック
  const { user: authUser, error: authError } = await getAuthenticatedUser(request)
  if (authError) return authError

  // 管理者権限チェック
  const { error: adminError } = checkAdmin(authUser!.role)
  if (adminError) return adminError

  try {
    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'ユーザーIDとロールが必要です' },
        { status: 400 }
      )
    }

    // アプリケーション側のロール型（小文字）に変換して検証
    const appRole = stringToAppRole(role)
    if (!appRole) {
      return NextResponse.json(
        { error: '無効なロールです。有効な値: member, fp, manager, admin' },
        { status: 400 }
      )
    }

    // PrismaのUserRole（大文字）に変換
    const prismaRole = appRoleToPrismaRole(appRole)

    // 現在のユーザー情報を取得
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    const currentRole = currentUser.role
    const isDowngradeToMember = prismaRole === UserRole.MEMBER &&
      (currentRole === UserRole.FP || currentRole === UserRole.MANAGER)
    const isUpgradeToFP = prismaRole === UserRole.FP && currentRole === UserRole.MEMBER

    // Prismaでユーザーロールを更新
    try {
      // 更新データを構築
      const updateData: {
        role: UserRole
        complianceTestPassed?: boolean
        complianceTestPassedAt?: null
        fpOnboardingCompleted?: boolean
        fpOnboardingCompletedAt?: null
      } = { role: prismaRole }

      // FPエイドに昇格する場合はコンプライアンステストを再受験必須にする
      if (isUpgradeToFP) {
        updateData.complianceTestPassed = false
        updateData.complianceTestPassedAt = null
        updateData.fpOnboardingCompleted = false
        updateData.fpOnboardingCompletedAt = null
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData
      })

      // FPエイド/マネージャーからメンバーに降格する場合は昇格申請データをリセット
      if (isDowngradeToMember) {
        // FPPromotionApplicationを削除（存在する場合）
        await prisma.fPPromotionApplication.deleteMany({
          where: { userId }
        })

        // LP面談データを削除（完了済みも含めて全て削除し、再度申請可能にする）
        await prisma.lPMeeting.deleteMany({
          where: { memberId: userId }
        })

        // 事前アンケート回答を削除
        await prisma.preInterviewResponse.deleteMany({
          where: { respondentId: userId }
        })

        console.log(`Reset FPPromotionApplication, LPMeeting, and PreInterviewResponse for user ${userId} due to demotion to MEMBER`)
      }
    } catch (prismaError: any) {
      console.error('Prisma user update error:', prismaError)
      // ユーザーが存在しない場合は404を返す
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'ユーザーロールの更新に失敗しました' },
        { status: 500 }
      )
    }

    // Supabaseでユーザーのメタデータを更新（大文字で保存）
    const { error: supabaseError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role: prismaRole }
    })

    if (supabaseError) {
      console.error('Supabase user update error:', supabaseError)
      // Prismaは更新済みなので、警告のみ
      console.warn('Supabase metadata update failed, but Prisma update succeeded')
    }

    return NextResponse.json({ 
      success: true,
      role: appRole // アプリケーション側のロール型（小文字）を返す
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
