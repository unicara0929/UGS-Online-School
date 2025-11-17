import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin && adminError) return adminError

    // PrismaからFPエイド以上のロールを持つユーザーを取得
    const fpUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['FP', 'MANAGER', 'ADMIN']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      users: fpUsers
    })
  } catch (error) {
    console.error('FP users fetch error:', error)
    return NextResponse.json(
      { error: 'FPエイド一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
