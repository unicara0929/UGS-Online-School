import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { prismaRoleToAppRole } from '@/lib/utils/role-mapper'
import { createClient } from '@/lib/supabase/server'

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

    // 認証チェック: リクエストしたユーザーが自分自身のプロフィールのみ取得可能
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser || authUser.id !== userId) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 環境未設定時は404相当で返す（UIを壊さない）
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // Prismaでユーザープロファイルを取得
    // 根本的な解決: リトライではなく、接続プール設定を最適化することで問題を解決
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

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
        memberId: user.memberId,
        referralCode: user.referralCode,
        phone: user.phone,
        address: user.address,
        bio: user.bio,
        attribute: user.attribute,
        gender: user.gender,
        birthDate: user.birthDate,
        prefecture: user.prefecture,
        profileImageUrl: user.profileImageUrl,
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
        error.message?.includes('database server') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Timeout') ||
        error.message?.includes('Tenant or user not found') ||
        error.message?.includes('FATAL') ||
        error.code === 'P1001' || // Can't reach database server
        error.code === 'P1017') { // Server has closed the connection
      console.error('Database connection error detected:', {
        errorName: error.constructor?.name,
        errorCode: error.code,
        errorMessage: error.message,
        databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
      })
      
      // "Tenant or user not found"エラーの場合、接続URLの形式が間違っている可能性がある
      if (error.message?.includes('Tenant or user not found')) {
        return NextResponse.json(
          { 
            error: 'データベース接続URLの形式が正しくありません。SupabaseのTransaction Pooler URLを確認してください。',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 503 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'データベースに接続できません。接続設定を確認してください。',
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
