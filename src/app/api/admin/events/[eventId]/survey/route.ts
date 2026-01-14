import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { EventSurveyQuestionType, Prisma } from '@prisma/client'

// GET: イベントのアンケート取得
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { eventId } = await context.params

    // イベント存在確認
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true }
    })

    if (!event) {
      return NextResponse.json({ success: false, error: 'イベントが見つかりません' }, { status: 404 })
    }

    // アンケート取得
    const survey = await prisma.eventSurvey.findUnique({
      where: { eventId },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      event,
      survey
    })
  } catch (error) {
    console.error('Error fetching event survey:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// POST: アンケート作成
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { eventId } = await context.params
    const body = await request.json()
    const { title, description, questions } = body

    // イベント存在確認
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json({ success: false, error: 'イベントが見つかりません' }, { status: 404 })
    }

    // 既存アンケート確認
    const existingSurvey = await prisma.eventSurvey.findUnique({
      where: { eventId }
    })

    if (existingSurvey) {
      return NextResponse.json({ success: false, error: 'このイベントには既にアンケートが存在します' }, { status: 400 })
    }

    // バリデーション
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ success: false, error: 'タイトルと質問は必須です' }, { status: 400 })
    }

    // アンケート作成
    const survey = await prisma.eventSurvey.create({
      data: {
        eventId,
        title,
        description: description || null,
        questions: {
          create: questions.map((q: { question: string; type: EventSurveyQuestionType; options?: string[]; required?: boolean; description?: string }, index: number) => ({
            order: index + 1,
            question: q.question,
            type: q.type || 'TEXT',
            options: q.options && q.options.length > 0 ? q.options : Prisma.DbNull,
            required: q.required || false,
            description: q.description || null
          }))
        }
      },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      survey
    })
  } catch (error) {
    console.error('Error creating event survey:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// PUT: アンケート更新
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { eventId } = await context.params
    const body = await request.json()
    const { title, description, questions, isActive } = body

    // 既存アンケート確認
    const existingSurvey = await prisma.eventSurvey.findUnique({
      where: { eventId }
    })

    if (!existingSurvey) {
      return NextResponse.json({ success: false, error: 'アンケートが見つかりません' }, { status: 404 })
    }

    // トランザクションで更新
    const survey = await prisma.$transaction(async (tx) => {
      // アンケート基本情報更新
      await tx.eventSurvey.update({
        where: { id: existingSurvey.id },
        data: {
          title: title || existingSurvey.title,
          description: description !== undefined ? description : existingSurvey.description,
          isActive: isActive !== undefined ? isActive : existingSurvey.isActive
        }
      })

      // 質問更新（全削除→再作成）
      if (questions && Array.isArray(questions)) {
        await tx.eventSurveyQuestion.deleteMany({
          where: { surveyId: existingSurvey.id }
        })

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i] as { question: string; type: EventSurveyQuestionType; options?: string[]; required?: boolean; description?: string }
          await tx.eventSurveyQuestion.create({
            data: {
              surveyId: existingSurvey.id,
              order: i + 1,
              question: q.question,
              type: q.type || 'TEXT',
              options: q.options && q.options.length > 0 ? q.options : Prisma.DbNull,
              required: q.required || false,
              description: q.description || null
            }
          })
        }
      }

      // 更新後のデータ取得
      return tx.eventSurvey.findUnique({
        where: { id: existingSurvey.id },
        include: {
          questions: {
            orderBy: { order: 'asc' }
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      survey
    })
  } catch (error) {
    console.error('Error updating event survey:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// DELETE: アンケート削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { eventId } = await context.params

    // 既存アンケート確認
    const existingSurvey = await prisma.eventSurvey.findUnique({
      where: { eventId }
    })

    if (!existingSurvey) {
      return NextResponse.json({ success: false, error: 'アンケートが見つかりません' }, { status: 404 })
    }

    // 削除（cascade で questions, responses, answers も削除される）
    await prisma.eventSurvey.delete({
      where: { id: existingSurvey.id }
    })

    return NextResponse.json({
      success: true,
      message: 'アンケートを削除しました'
    })
  } catch (error) {
    console.error('Error deleting event survey:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
