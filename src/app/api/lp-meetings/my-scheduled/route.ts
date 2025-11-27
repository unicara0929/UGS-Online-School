import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups } from '@/lib/auth/api-helpers'

/**
 * FPエイドが自分のスケジュール済みLP面談を取得
 * GET /api/lp-meetings/my-scheduled?fpId={fpId}
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // FP以上のロールチェック
    const { allowed, error: roleError } = checkRole(authUser!.role, RoleGroups.FP_AND_ABOVE)
    if (!allowed) return roleError!

    // クエリパラメータのfpIdを使わず、認証ユーザーのIDを使用
    const fpId = authUser!.id

    // FPエイドに割り当てられた面談を取得
    const meetings = await prisma.lPMeeting.findMany({
      where: {
        fpId: fpId,
        status: {
          in: ['SCHEDULED', 'COMPLETED']
        }
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        fp: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        preInterviewResponse: {
          include: {
            template: {
              include: {
                questions: {
                  orderBy: { order: 'asc' }
                }
              }
            },
            answers: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      meetings: meetings.map(meeting => ({
        id: meeting.id,
        memberId: meeting.memberId,
        fpId: meeting.fpId,
        status: meeting.status,
        scheduledAt: meeting.scheduledAt?.toISOString() || null,
        completedAt: meeting.completedAt?.toISOString() || null,
        meetingUrl: meeting.meetingUrl,
        meetingPlatform: meeting.meetingPlatform,
        notes: meeting.notes,
        memberNotes: meeting.memberNotes,
        member: meeting.member,
        fp: meeting.fp,
        preInterviewResponse: meeting.preInterviewResponse ? {
          id: meeting.preInterviewResponse.id,
          status: meeting.preInterviewResponse.status,
          completedAt: meeting.preInterviewResponse.completedAt?.toISOString() || null,
          template: {
            name: meeting.preInterviewResponse.template.name,
            questions: meeting.preInterviewResponse.template.questions.map(q => ({
              id: q.id,
              order: q.order,
              category: q.category,
              question: q.question,
              type: q.type,
              options: q.options
            }))
          },
          answers: meeting.preInterviewResponse.answers.map(a => ({
            questionId: a.questionId,
            value: a.value
          }))
        } : null
      }))
    })
  } catch (error: any) {
    console.error('LP面談取得エラー:', error)
    return NextResponse.json(
      { error: '面談の取得に失敗しました' },
      { status: 500 }
    )
  }
}

