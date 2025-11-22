import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// カテゴリ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const categories = await prisma.fAQCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { faqs: true },
        },
      },
    })

    return NextResponse.json({ success: true, categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ success: false, error: 'カテゴリの取得に失敗しました' }, { status: 500 })
  }
}

// カテゴリ作成
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, order, isActive } = body

    if (!name) {
      return NextResponse.json({ success: false, error: 'カテゴリ名は必須です' }, { status: 400 })
    }

    const category = await prisma.fAQCategory.create({
      data: {
        name,
        description: description || null,
        order: order ?? 0,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json({ success: true, category })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ success: false, error: 'カテゴリの作成に失敗しました' }, { status: 500 })
  }
}
