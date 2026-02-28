import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { lessonId } = await params

    const rating = await prisma.lessonRating.findUnique({
      where: {
        userId_lessonId: {
          userId: user!.id,
          lessonId,
        },
      },
      select: {
        rating: true,
        comment: true,
      },
    })

    return NextResponse.json({ success: true, rating: rating ?? null })
  } catch (error) {
    console.error('[LESSON_RATING_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '評価の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { lessonId } = await params
    const body = await request.json()
    const { rating, comment } = body

    // バリデーション: ratingが1〜5の整数であること
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: '評価は1〜5の整数で指定してください' },
        { status: 400 }
      )
    }

    // レッスンが存在するか確認
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    })

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'レッスンが見つかりません' },
        { status: 404 }
      )
    }

    // 評価をupsert（作成または更新）
    const lessonRating = await prisma.lessonRating.upsert({
      where: {
        userId_lessonId: {
          userId: user!.id,
          lessonId,
        },
      },
      update: {
        rating,
        comment: comment ?? null,
      },
      create: {
        userId: user!.id,
        lessonId,
        rating,
        comment: comment ?? null,
      },
    })

    return NextResponse.json({
      success: true,
      rating: {
        rating: lessonRating.rating,
        comment: lessonRating.comment,
      },
    })
  } catch (error) {
    console.error('[LESSON_RATING_POST_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '評価の保存に失敗しました' },
      { status: 500 }
    )
  }
}
