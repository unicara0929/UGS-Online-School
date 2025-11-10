import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPromotionEligibility } from '@/lib/services/promotion-eligibility'
import { appRoleToPrismaRole, stringToPrismaRole } from '@/lib/utils/role-mapper'
import { UserRole } from '@prisma/client'

/**
 * 昇格可能性をチェック
 * GET /api/promotions/eligibility
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const targetRole = searchParams.get('targetRole')

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

    // 昇格可能性をチェック
    const eligibility = await checkPromotionEligibility(userId, prismaTargetRole)

    return NextResponse.json({
      success: true,
      eligibility
    })
  } catch (error) {
    console.error('Check promotion eligibility error:', error)
    return NextResponse.json(
      { error: '昇格可能性のチェックに失敗しました' },
      { status: 500 }
    )
  }
}

