import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// 名刺デザイン一覧取得
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    // FPエイド以上のみアクセス可能
    if (!user || !['FP', 'MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    const designs = await prisma.businessCardDesign.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ success: true, designs })
  } catch (error) {
    console.error('Error fetching business card designs:', error)
    return NextResponse.json(
      { success: false, error: 'デザイン一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
