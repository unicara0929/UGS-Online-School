import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * アンケートを作成（管理者）
 * POST /api/admin/survey
 */
export async function POST(request: NextRequest) {
  try {
    const { title, questions } = await request.json()

    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'タイトルと設問が必要です' },
        { status: 400 }
      )
    }

    // 設問数が10問であることを確認
    if (questions.length !== 10) {
      return NextResponse.json(
        { error: '設問は10問である必要があります' },
        { status: 400 }
      )
    }

    // 各設問の形式を確認
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      if (!question.question || question.question.trim() === '') {
        return NextResponse.json(
          { error: `設問${i + 1}の内容が空です` },
          { status: 400 }
        )
      }
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        questions
      }
    })

    return NextResponse.json({
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        questions: survey.questions
      }
    })
  } catch (error) {
    console.error('Create survey error:', error)
    return NextResponse.json(
      { error: 'アンケートの作成に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * アンケート一覧を取得（管理者）
 * GET /api/admin/survey
 */
export async function GET(request: NextRequest) {
  try {
    const surveys = await prisma.survey.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: {
            submissions: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      surveys: surveys.map(survey => ({
        id: survey.id,
        title: survey.title,
        createdAt: survey.createdAt,
        submissionCount: survey._count.submissions
      }))
    })
  } catch (error) {
    console.error('Get surveys error:', error)
    return NextResponse.json(
      { error: 'アンケート一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

