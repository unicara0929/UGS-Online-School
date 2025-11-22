import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// 自分の名刺注文履歴を取得
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

    const orders = await prisma.businessCardOrder.findMany({
      where: { userId: user.id },
      include: {
        design: {
          select: { id: true, name: true, previewUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, orders })
  } catch (error) {
    console.error('Error fetching business card orders:', error)
    return NextResponse.json(
      { success: false, error: '注文履歴の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 名刺注文の作成は /api/business-card/checkout エンドポイントを使用してください
// 直接の注文作成は決済フローを経由する必要があります
