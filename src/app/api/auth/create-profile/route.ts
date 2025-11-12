import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { appRoleToPrismaRole, prismaRoleToAppRole, stringToAppRole } from '@/lib/utils/role-mapper'

export async function POST(request: NextRequest) {
  // リクエストボディを最初に読み込む（エラー時でも使用可能にするため）
  let requestBody: { userId?: string; email?: string; name?: string; role?: string }
  try {
    requestBody = await request.json()
  } catch (parseError) {
    return NextResponse.json(
      { error: 'リクエストの解析に失敗しました' },
      { status: 400 }
    )
  }

  const { userId, email, name, role } = requestBody

  try {
    console.log('Create profile request:', { userId, email, name, role })

    if (!userId || !email || !name || !role) {
      console.error('Missing required fields:', { userId: !!userId, email: !!email, name: !!name, role: !!role })
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      )
    }

    // 既存のユーザーをチェック（IDまたはメールアドレスで）
    // 根本的な解決: リトライではなく、接続プール設定を最適化することで問題を解決
    const existingUserById = await prisma.user.findUnique({
      where: { id: userId }
    })

    const existingUserByEmail = await prisma.user.findUnique({
      where: { email }
    })

    // 既に存在する場合は、そのユーザーを返す
    if (existingUserById) {
      console.log('User already exists by ID:', { id: userId, email: existingUserById.email })
      const responseRole = prismaRoleToAppRole(existingUserById.role)
      return NextResponse.json({
        success: true,
        user: {
          id: existingUserById.id,
          email: existingUserById.email,
          name: existingUserById.name,
          role: responseRole,
          referralCode: existingUserById.referralCode,
          createdAt: existingUserById.createdAt,
          updatedAt: existingUserById.updatedAt
        }
      })
    }

    // メールアドレスで既に存在するが、IDが異なる場合
    if (existingUserByEmail && existingUserByEmail.id !== userId) {
      console.log('User exists with different ID:', { existingId: existingUserByEmail.id, newId: userId, email })
      return NextResponse.json(
        { error: 'このメールアドレスは既に別のアカウントで使用されています' },
        { status: 409 }
      )
    }

    // アプリケーション側のロール型（小文字）に変換して検証
    const appRole = stringToAppRole(role) || 'member' // デフォルトはmember
    const prismaRole = appRoleToPrismaRole(appRole)

    console.log('Role mapping:', { inputRole: role, appRole, prismaRole })

    // Prismaでユーザープロファイルを作成（リトライ付き）
    // 根本的な解決: リトライではなく、接続プール設定を最適化することで問題を解決
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        name,
        role: prismaRole,
      }
    })

    console.log('User created successfully:', { id: user.id, email: user.email, role: user.role })

    // アプリケーション側のロール型（小文字）に変換して返す
    const responseRole = prismaRoleToAppRole(user.role)

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: responseRole,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error: any) {
    console.error('Create profile error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    
    // データベース接続エラーの場合
    if (error.constructor?.name === 'PrismaClientInitializationError' || 
        error.message?.includes('Can\'t reach database server') ||
        error.message?.includes('database server')) {
      console.error('Database connection error detected')
      return NextResponse.json(
        { 
          error: 'データベースに接続できません。しばらく待ってから再度お試しください。',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 } // Service Unavailable
      )
    }
    
    // 重複エラーの場合
    if (error.code === 'P2002') {
      // 重複フィールドを特定
      const target = error.meta?.target
      if (Array.isArray(target) && target.includes('email')) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 409 }
        )
      }
      if (Array.isArray(target) && target.includes('id') && userId) {
        // IDが重複している場合、既存ユーザーを取得して返す
        // 根本的な解決: リトライではなく、接続プール設定を最適化することで問題を解決
        try {
          const existingUser = await prisma.user.findUnique({
            where: { id: userId }
          })
          if (existingUser) {
            const responseRole = prismaRoleToAppRole(existingUser.role)
            return NextResponse.json({
              success: true,
              user: {
                id: existingUser.id,
                email: existingUser.email,
                name: existingUser.name,
                role: responseRole,
                referralCode: existingUser.referralCode,
                createdAt: existingUser.createdAt,
                updatedAt: existingUser.updatedAt
              }
            })
          }
        } catch (lookupError) {
          console.error('Failed to lookup existing user:', lookupError)
        }
      }
      return NextResponse.json(
        { error: 'このユーザーは既に登録されています' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { 
        error: 'ユーザープロファイルの作成に失敗しました',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
