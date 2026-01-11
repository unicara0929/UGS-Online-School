import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// テンプレート一覧取得
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const templates = await prisma.surveyTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        questions: t.questions,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[SURVEY_TEMPLATES_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'テンプレートの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// テンプレート作成
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, questions } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'テンプレート名は必須です' },
        { status: 400 }
      )
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: '質問が1つ以上必要です' },
        { status: 400 }
      )
    }

    const template = await prisma.surveyTemplate.create({
      data: {
        name: name.trim(),
        description: description || null,
        questions,
      },
    })

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        questions: template.questions,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[SURVEY_TEMPLATES_POST_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'テンプレートの作成に失敗しました' },
      { status: 500 }
    )
  }
}
