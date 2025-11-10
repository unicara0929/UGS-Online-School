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

    // タイムアウト設定（8秒）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('リクエストがタイムアウトしました')), 8000)
    })

    // 昇格可能性をチェック
    const eligibilityPromise = checkPromotionEligibility(userId, prismaTargetRole)
    const eligibility = await Promise.race([eligibilityPromise, timeoutPromise]) as Awaited<ReturnType<typeof checkPromotionEligibility>>

    return NextResponse.json({
      success: true,
      eligibility
    })
  } catch (error: any) {
    console.error('Check promotion eligibility error:', error)
    
    if (error.message?.includes('タイムアウト')) {
      return NextResponse.json(
        { error: 'リクエストがタイムアウトしました。しばらく待ってから再度お試しください。' },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { error: '昇格可能性のチェックに失敗しました' },
      { status: 500 }
    )
  }
}

