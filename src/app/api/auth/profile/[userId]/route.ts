import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { prismaRoleToAppRole } from '@/lib/utils/role-mapper'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      )
    }

    // 環境未設定時は404相当で返す（UIを壊さない）
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // Prismaでユーザープロファイルを取得（リトライ付き）
    const user = await withRetry(
      () => prisma.user.findUnique({
        where: { id: userId }
      }),
      3, // 最大3回リトライ
      1000 // 初期待機時間1秒
    )

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // Prismaのenum（大文字）をアプリケーション側のロール型（小文字）に変換
    const role = prismaRoleToAppRole(user.role)

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: role,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
      }
    })
  } catch (error: any) {
    console.error('Get profile error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      errorName: error.constructor?.name
    })
    
    // データベース接続エラーの場合
    if (error.constructor?.name === 'PrismaClientInitializationError' || 
        error.message?.includes('Can\'t reach database server') ||
        error.message?.includes('database server')) {
      console.error('Database connection error detected after retries')
      return NextResponse.json(
        { 
          error: 'データベースに接続できません。しばらく待ってから再度お試しください。',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 } // Service Unavailable
      )
    }
    
    // Prisma接続失敗時もUIは落とさない
    return NextResponse.json(
      { 
        error: 'ユーザーが見つかりません',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 404 }
    )
  }
}
