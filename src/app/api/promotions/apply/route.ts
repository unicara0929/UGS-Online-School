import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPromotionEligibility } from '@/lib/services/promotion-eligibility'
import { stringToPrismaRole } from '@/lib/utils/role-mapper'
import { PromotionStatus } from '@prisma/client'

/**
 * 昇格申請
 * POST /api/promotions/apply
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, targetRole } = await request.json()

    if (!userId || !targetRole) {
      return NextResponse.json(
        { error: 'ユーザーIDと目標ロールが必要です' },
        { status: 400 }
      )
    }

    // 目標ロールをPrismaのUserRoleに変換
    const prismaTargetRole = stringToPrismaRole(targetRole)
    if (!prismaTargetRole) {
      return NextResponse.json(
        { error: '無効な目標ロールです' },
        { status: 400 }
      )
    }

    // ユーザーの現在のロールを確認
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 既存の申請をチェック
    const existingApplication = await prisma.promotionApplication.findUnique({
      where: {
        userId_targetRole: {
          userId,
          targetRole: prismaTargetRole
        }
      }
    })

    if (existingApplication) {
      if (existingApplication.status === PromotionStatus.PENDING) {
        return NextResponse.json(
          { error: '既に申請中の昇格があります' },
          { status: 409 }
        )
      }
    }

    // 昇格可能性をチェック
    const eligibility = await checkPromotionEligibility(userId, prismaTargetRole)

    if (!eligibility.isEligible) {
      return NextResponse.json(
        { 
          error: '昇格条件を満たしていません',
          eligibility 
        },
        { status: 400 }
      )
    }

    // 昇格申請を作成
    const application = await prisma.promotionApplication.create({
      data: {
        userId,
        targetRole: prismaTargetRole,
        status: PromotionStatus.PENDING
      }
    })

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        userId: application.userId,
        targetRole: application.targetRole,
        status: application.status,
        appliedAt: application.appliedAt
      }
    })
  } catch (error: any) {
    console.error('Apply promotion error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '既に申請中の昇格があります' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: '昇格申請に失敗しました' },
      { status: 500 }
    )
  }
}

