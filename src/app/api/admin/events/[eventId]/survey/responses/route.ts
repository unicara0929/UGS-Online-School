import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// GET: イベントアンケートの全回答を取得（管理者用）
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
      select: { id: true, title: true, date: true }
    })

    if (!event) {
      return NextResponse.json({ success: false, error: 'イベントが見つかりません' }, { status: 404 })
    }

    // アンケート取得（質問含む）
    const survey = await prisma.eventSurvey.findUnique({
      where: { eventId },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!survey) {
      return NextResponse.json({
        success: true,
        event,
        survey: null,
        responses: [],
        summary: { totalResponses: 0 }
      })
    }

    // 全回答を取得（ユーザー情報と回答内容を含む）
    const responses = await prisma.eventSurveyResponse.findMany({
      where: { surveyId: survey.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberId: true,
            role: true
          }
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                order: true,
                question: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    })

    // 回答を整形
    const formattedResponses = responses.map(response => ({
      id: response.id,
      submittedAt: response.submittedAt,
      user: response.user,
      answers: response.answers
        .sort((a, b) => a.question.order - b.question.order)
        .map(answer => ({
          questionId: answer.questionId,
          questionOrder: answer.question.order,
          questionText: answer.question.question,
          questionType: answer.question.type,
          value: answer.value
        }))
    }))

    // サマリー（質問ごとの回答集計）
    const questionSummary = survey.questions.map(question => {
      const questionAnswers = responses.flatMap(r =>
        r.answers.filter(a => a.questionId === question.id)
      )

      // 質問タイプに応じた集計
      let summary: Record<string, number> | null = null
      if (['SELECT', 'RADIO', 'MULTI_SELECT'].includes(question.type)) {
        summary = {}
        questionAnswers.forEach(answer => {
          const value = answer.value
          if (Array.isArray(value)) {
            value.forEach((v) => {
              if (typeof v === 'string') {
                summary![v] = (summary![v] || 0) + 1
              }
            })
          } else if (typeof value === 'string') {
            summary![value] = (summary![value] || 0) + 1
          }
        })
      } else if (question.type === 'RATING') {
        summary = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        questionAnswers.forEach(answer => {
          const rating = String(answer.value)
          if (summary![rating] !== undefined) {
            summary![rating]++
          }
        })
      }

      return {
        questionId: question.id,
        question: question.question,
        type: question.type,
        totalAnswers: questionAnswers.length,
        summary
      }
    })

    return NextResponse.json({
      success: true,
      event,
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        questions: survey.questions
      },
      responses: formattedResponses,
      summary: {
        totalResponses: responses.length,
        questionSummary
      }
    })
  } catch (error) {
    console.error('Error fetching survey responses:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
