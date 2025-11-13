import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPromotionEligibility } from '@/lib/services/promotion-eligibility'
import { appRoleToPrismaRole, stringToPrismaRole } from '@/lib/utils/role-mapper'
import { UserRole } from '@prisma/client'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 昇格可能性をチェック
 * GET /api/promotions/eligibility
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const targetRole = searchParams.get('targetRole')

    // クエリパラメータのuserIdを使わず、認証ユーザーのIDを使用
    const userId = authUser!.id

    if (!targetRole) {
      return NextResponse.json(
        { error: '目標ロールが必要です' },
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
    console.error('Error details:', {
      errorName: error.constructor?.name,
      errorCode: error.code,
      errorMessage: error.message,
      stack: error.stack
    })
    
    if (error.message?.includes('タイムアウト')) {
      return NextResponse.json(
        { error: 'リクエストがタイムアウトしました。しばらく待ってから再度お試しください。' },
        { status: 504 }
      )
    }
    
    // データベース接続エラーの場合
    if (error.message?.includes('データベース') || 
        error.message?.includes('database') ||
        error.message?.includes('接続')) {
      return NextResponse.json(
        { 
          error: 'データベースに接続できません。接続設定を確認してください。',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        error: '昇格可能性のチェックに失敗しました',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

