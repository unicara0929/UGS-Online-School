import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // 既存の仮登録ユーザーをチェック
    const existingPendingUser = await prisma.pendingUser.findUnique({
      where: { email }
    })

    if (existingPendingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に仮登録されています' },
        { status: 409 }
      )
    }

    // 既存の正式ユーザーをチェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      )
    }

    // 仮登録ユーザーを作成
    const pendingUser = await prisma.pendingUser.create({
      data: {
        email,
        name,
      }
    })

    return NextResponse.json({ 
      success: true, 
      pendingUser: {
        id: pendingUser.id,
        email: pendingUser.email,
        name: pendingUser.name,
        createdAt: pendingUser.createdAt
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
