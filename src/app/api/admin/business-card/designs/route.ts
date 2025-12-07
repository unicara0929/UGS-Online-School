import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// 名刺デザイン一覧取得（管理者用）
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const designs = await prisma.businessCardDesign.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { orders: true } },
      },
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

// 名刺デザイン作成
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, previewUrl, previewUrlBack, isActive, order } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'デザイン名を入力してください' },
        { status: 400 }
      )
    }

    const design = await prisma.businessCardDesign.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        previewUrl: previewUrl?.trim() || null,
        previewUrlBack: previewUrlBack?.trim() || null,
        isActive: isActive !== false,
        order: order || 0,
      },
    })

    return NextResponse.json({ success: true, design })
  } catch (error) {
    console.error('Error creating business card design:', error)
    return NextResponse.json(
      { success: false, error: 'デザインの作成に失敗しました' },
      { status: 500 }
    )
  }
}
