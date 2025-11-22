import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ViewCategory } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { category } = body

    // カテゴリのバリデーション
    const validCategories: ViewCategory[] = ['EVENTS', 'COURSES', 'MATERIALS', 'NOTIFICATIONS']
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: '無効なカテゴリです' },
        { status: 400 }
      )
    }

    // upsert: 既存のレコードがあれば更新、なければ作成
    await prisma.userCategoryView.upsert({
      where: {
        userId_category: {
          userId: authUser.id,
          category: category as ViewCategory,
        },
      },
      update: {
        lastViewedAt: new Date(),
      },
      create: {
        userId: authUser.id,
        category: category as ViewCategory,
        lastViewedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking category as viewed:', error)
    return NextResponse.json(
      { success: false, error: 'カテゴリの閲覧記録に失敗しました' },
      { status: 500 }
    )
  }
}
