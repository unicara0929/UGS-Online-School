import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * カテゴリ設定取得API（認証済みユーザー向け）
 */
export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const settings = await prisma.categorySetting.findMany({
      orderBy: { category: 'asc' }
    })

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Category settings GET error:', error)
    return NextResponse.json(
      { error: 'カテゴリ設定の取得に失敗しました' },
      { status: 500 }
    )
  }
}
