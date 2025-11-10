import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { appRoleToPrismaRole, prismaRoleToAppRole, stringToAppRole } from '@/lib/utils/role-mapper'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, name, role } = await request.json()

    if (!userId || !email || !name || !role) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      )
    }

    // アプリケーション側のロール型（小文字）に変換して検証
    const appRole = stringToAppRole(role) || 'member' // デフォルトはmember
    const prismaRole = appRoleToPrismaRole(appRole)

    // Prismaでユーザープロファイルを作成
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        name,
        role: prismaRole,
      }
    })

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
    
    // 重複エラーの場合
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'ユーザープロファイルの作成に失敗しました' },
      { status: 500 }
    )
  }
}
