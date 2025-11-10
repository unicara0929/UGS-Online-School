import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Prismaでユーザープロファイルを取得
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    // Prisma接続失敗時もUIは落とさない
    return NextResponse.json(
      { error: 'ユーザーが見つかりません' },
      { status: 404 }
    )
  }
}
