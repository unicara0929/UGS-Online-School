import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// FAQ一覧取得（会員向け）
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // 公開中のカテゴリと公開中のFAQを取得
    const categories = await prisma.fAQCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
      include: {
        faqs: {
          where: {
            isPublished: true,
            ...(search ? {
              OR: [
                { question: { contains: search, mode: 'insensitive' as const } },
                { answer: { contains: search, mode: 'insensitive' as const } },
              ],
            } : {}),
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    // FAQが1件以上あるカテゴリのみ返す
    const filteredCategories = categories.filter(cat => cat.faqs.length > 0)

    return NextResponse.json({
      success: true,
      categories: filteredCategories,
    })
  } catch (error) {
    console.error('Error fetching FAQs:', error)
    return NextResponse.json(
      { success: false, error: 'FAQの取得に失敗しました' },
      { status: 500 }
    )
  }
}
