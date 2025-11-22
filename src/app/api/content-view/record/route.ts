import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ContentType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { contentType, contentId } = body

    // コンテンツタイプのバリデーション
    const validContentTypes: ContentType[] = ['EVENT', 'COURSE', 'LESSON', 'MATERIAL']
    if (!contentType || !validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { success: false, error: '無効なコンテンツタイプです' },
        { status: 400 }
      )
    }

    if (!contentId) {
      return NextResponse.json(
        { success: false, error: 'コンテンツIDが必要です' },
        { status: 400 }
      )
    }

    // upsert: 既存のレコードがあれば何もしない、なければ作成
    // firstViewedAtは最初の閲覧日時を保持したいので、updateでは変更しない
    await prisma.userContentView.upsert({
      where: {
        userId_contentType_contentId: {
          userId: authUser.id,
          contentType: contentType as ContentType,
          contentId: contentId,
        },
      },
      update: {}, // 既存の場合は更新しない（firstViewedAtを保持）
      create: {
        userId: authUser.id,
        contentType: contentType as ContentType,
        contentId: contentId,
        firstViewedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording content view:', error)
    return NextResponse.json(
      { success: false, error: 'コンテンツ閲覧の記録に失敗しました' },
      { status: 500 }
    )
  }
}
