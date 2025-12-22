import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// GET: イベントのアンケート取得（ユーザー用）
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError
    if (!user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
    }

    const { eventId } = await context.params

    // アンケート取得
    const survey = await prisma.eventSurvey.findUnique({
      where: { eventId },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!survey || !survey.isActive) {
      return NextResponse.json({
        success: true,
        survey: null
      })
    }

    // ユーザーの既存回答を確認
    const existingResponse = await prisma.eventSurveyResponse.findUnique({
      where: {
        surveyId_userId: {
          surveyId: survey.id,
          userId: user.id
        }
      },
      include: {
        answers: true
      }
    })

    return NextResponse.json({
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        questions: survey.questions
      },
      existingResponse: existingResponse ? {
        id: existingResponse.id,
        submittedAt: existingResponse.submittedAt,
        answers: existingResponse.answers
      } : null
    })
  } catch (error) {
    console.error('Error fetching event survey:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// POST: アンケート回答送信（自動タイムスタンプ）
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError
    if (!user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
    }

    const { eventId } = await context.params
    const body = await request.json()
    const { answers } = body // { questionId: value } の形式

    // アンケート取得
    const survey = await prisma.eventSurvey.findUnique({
      where: { eventId },
      include: {
        questions: true
      }
    })

    if (!survey || !survey.isActive) {
      return NextResponse.json({ success: false, error: 'アンケートが見つかりません' }, { status: 404 })
    }

    // 既存回答確認
    const existingResponse = await prisma.eventSurveyResponse.findUnique({
      where: {
        surveyId_userId: {
          surveyId: survey.id,
          userId: user.id
        }
      }
    })

    if (existingResponse) {
      return NextResponse.json({ success: false, error: '既に回答済みです' }, { status: 400 })
    }

    // 必須質問のバリデーション
    const requiredQuestions = survey.questions.filter(q => q.required)
    for (const question of requiredQuestions) {
      if (!answers || answers[question.id] === undefined || answers[question.id] === '' ||
          (Array.isArray(answers[question.id]) && answers[question.id].length === 0)) {
        return NextResponse.json({
          success: false,
          error: `「${question.question}」は必須です`
        }, { status: 400 })
      }
    }

    // トランザクションで回答を保存
    const response = await prisma.$transaction(async (tx) => {
      // 回答レコード作成（submittedAtは自動で現在時刻）
      const surveyResponse = await tx.eventSurveyResponse.create({
        data: {
          surveyId: survey.id,
          userId: user.id,
          submittedAt: new Date() // 自動タイムスタンプ
        }
      })

      // 各質問への回答を保存
      if (answers && typeof answers === 'object') {
        const answerData = Object.entries(answers)
          .filter(([questionId]) => survey.questions.some(q => q.id === questionId))
          .map(([questionId, value]) => ({
            responseId: surveyResponse.id,
            questionId,
            value: value as unknown as object
          }))

        if (answerData.length > 0) {
          await tx.eventSurveyAnswer.createMany({
            data: answerData
          })
        }
      }

      // EventRegistrationのsurveyCompletedを更新
      const registration = await tx.eventRegistration.findUnique({
        where: {
          userId_eventId: {
            userId: user.id,
            eventId
          }
        }
      })

      if (registration) {
        await tx.eventRegistration.update({
          where: { id: registration.id },
          data: {
            surveyCompleted: true,
            surveyCompletedAt: new Date()
          }
        })

        // 動画視聴も完了していれば出席完了とする
        if (registration.videoWatched) {
          await tx.eventRegistration.update({
            where: { id: registration.id },
            data: {
              attendanceMethod: 'VIDEO_SURVEY',
              attendanceCompletedAt: new Date()
            }
          })
        }
      }

      return surveyResponse
    })

    return NextResponse.json({
      success: true,
      message: 'アンケートを送信しました',
      response: {
        id: response.id,
        submittedAt: response.submittedAt
      }
    })
  } catch (error) {
    console.error('Error submitting survey response:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
