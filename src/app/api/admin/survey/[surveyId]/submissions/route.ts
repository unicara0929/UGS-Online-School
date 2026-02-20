import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * アンケート回答一覧を取得（管理者）
 * GET /api/admin/survey/[surveyId]/submissions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { surveyId } = await params

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
    })

    if (!survey) {
      return NextResponse.json(
        { error: 'アンケートが見つかりません' },
        { status: 404 }
      )
    }

    const submissions = await prisma.surveySubmission.findMany({
      where: { surveyId },
      orderBy: { submittedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            memberId: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        questions: survey.questions,
      },
      submissions: submissions.map((s) => ({
        id: s.id,
        userId: s.userId,
        answers: s.answers,
        submittedAt: s.submittedAt,
        user: s.user,
      })),
    })
  } catch (error) {
    console.error('Get survey submissions error:', error)
    return NextResponse.json(
      { error: 'アンケート回答の取得に失敗しました' },
      { status: 500 }
    )
  }
}
