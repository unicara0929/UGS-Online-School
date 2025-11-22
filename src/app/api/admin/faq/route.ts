import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// FAQ一覧取得（管理者用）
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    const faqs = await prisma.fAQ.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        category: true,
      },
      orderBy: [
        { category: { order: 'asc' } },
        { order: 'asc' },
      ],
    })

    return NextResponse.json({ success: true, faqs })
  } catch (error) {
    console.error('Error fetching FAQs:', error)
    return NextResponse.json({ success: false, error: 'FAQの取得に失敗しました' }, { status: 500 })
  }
}

// FAQ作成
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const { categoryId, question, answer, order, isPublished } = body

    if (!categoryId || !question || !answer) {
      return NextResponse.json(
        { success: false, error: 'カテゴリ、質問、回答は必須です' },
        { status: 400 }
      )
    }

    const faq = await prisma.fAQ.create({
      data: {
        categoryId,
        question,
        answer,
        order: order ?? 0,
        isPublished: isPublished ?? true,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json({ success: true, faq })
  } catch (error) {
    console.error('Error creating FAQ:', error)
    return NextResponse.json({ success: false, error: 'FAQの作成に失敗しました' }, { status: 500 })
  }
}
