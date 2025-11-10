import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { appRoleToPrismaRole, prismaRoleToAppRole, stringToAppRole } from '@/lib/utils/role-mapper'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, name, role } = await request.json()

    console.log('Create profile request:', { userId, email, name, role })

    if (!userId || !email || !name || !role) {
      console.error('Missing required fields:', { userId: !!userId, email: !!email, name: !!name, role: !!role })
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      )
    }

    // アプリケーション側のロール型（小文字）に変換して検証
    const appRole = stringToAppRole(role) || 'member' // デフォルトはmember
    const prismaRole = appRoleToPrismaRole(appRole)

    console.log('Role mapping:', { inputRole: role, appRole, prismaRole })

    // Prismaでユーザープロファイルを作成
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
    
    // 重複エラーの場合
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
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
