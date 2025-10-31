import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 仮登録ユーザー一覧を取得
    const pendingUsers = await prisma.pendingUser.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ pendingUsers })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
