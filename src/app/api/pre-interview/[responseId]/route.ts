import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 事前アンケート回答詳細取得
 * GET /api/pre-interview/[responseId]
 * 権限: 回答者本人 または 担当FP または 管理者
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ responseId: string }> }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { responseId } = await params

    const response = await prisma.preInterviewResponse.findUnique({
      where: { id: responseId },
      include: {
        template: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          }
        },
        answers: true,
        respondent: {
          select: {
            id: true,
            name: true,
            email: true,
            memberId: true
          }
        },
        lpMeeting: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            fpId: true,
            fp: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!response) {
      return NextResponse.json(
        { error: '事前アンケートが見つかりません' },
        { status: 404 }
      )
    }

    // 権限チェック: 回答者本人 or 担当FP or 管理者
    const isRespondent = response.respondentId === authUser!.id
    const isFP = response.lpMeeting?.fpId === authUser!.id
    const isAdmin = authUser!.role === 'ADMIN'

    if (!isRespondent && !isFP && !isAdmin) {
      return NextResponse.json(
        { error: 'この回答を閲覧する権限がありません' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      response
    })
  } catch (error) {
    console.error('Get pre-interview response detail error:', error)
    return NextResponse.json(
      { error: '事前アンケートの取得に失敗しました' },
      { status: 500 }
    )
  }
}
