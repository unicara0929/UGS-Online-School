import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { checkManagerPromotionEligibility } from '@/lib/services/promotion-eligibility'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: memberId } = await params

    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const userId = authUser!.id
    const userRole = authUser!.role

    // MANAGER または ADMIN のみアクセス可能
    if (!['MANAGER', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'この機能にアクセスする権限がありません' },
        { status: 403 }
      )
    }

    // メンバー情報を取得
    const member = await prisma.user.findUnique({
      where: { id: memberId },
      include: {
        subscriptions: {
          select: {
            status: true,
            currentPeriodEnd: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        courseProgress: {
          where: {
            isCompleted: true,
          },
          select: {
            id: true,
          },
        },
        contracts: {
          where: {
            status: 'ACTIVE',
          },
          select: {
            id: true,
          },
        },
        fpPromotionApplications: {
          select: {
            lpMeetingCompleted: true,
            basicTestCompleted: true,
            surveyCompleted: true,
            status: true,
            approvedAt: true,
          },
          orderBy: {
            appliedAt: 'desc',
          },
          take: 1,
        },
        manager: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'メンバーが見つかりません' },
        { status: 404 }
      )
    }

    // マネージャーの場合、担当メンバーかどうか確認
    if (userRole === 'MANAGER' && member.managerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'このメンバーへのアクセス権限がありません' },
        { status: 403 }
      )
    }

    // MGR昇格条件の詳細を取得
    let promotionEligibility = null
    if (member.role === 'FP') {
      try {
        promotionEligibility = await checkManagerPromotionEligibility(memberId)
      } catch (error) {
        console.error(`Failed to get promotion eligibility for ${memberId}:`, error)
      }
    }

    const subscription = member.subscriptions[0]
    const fpApplication = member.fpPromotionApplications[0]

    const memberDetail = {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          }
        : null,
      stats: {
        completedLessons: member.courseProgress.length,
        activeContracts: member.contracts.length,
      },
      fpStatus: fpApplication
        ? {
            lpMeetingCompleted: fpApplication.lpMeetingCompleted,
            basicTestCompleted: fpApplication.basicTestCompleted,
            surveyCompleted: fpApplication.surveyCompleted,
            status: fpApplication.status,
            approvedAt: fpApplication.approvedAt?.toISOString() ?? null,
          }
        : null,
      manager: member.manager
        ? {
            id: member.manager.id,
            name: member.manager.name,
          }
        : null,
      promotionEligibility: promotionEligibility
        ? {
            isEligible: promotionEligibility.isEligible,
            conditions: {
              salesTotal: {
                current: promotionEligibility.conditions.salesTotal.current,
                target: promotionEligibility.conditions.salesTotal.target,
                met: promotionEligibility.conditions.salesTotal.met,
                percentage: Math.min(
                  100,
                  Math.round(
                    (promotionEligibility.conditions.salesTotal.current /
                      promotionEligibility.conditions.salesTotal.target) *
                      100
                  )
                ),
              },
              insuredCount: {
                current: promotionEligibility.conditions.insuredCount.current,
                target: promotionEligibility.conditions.insuredCount.target,
                met: promotionEligibility.conditions.insuredCount.met,
                percentage: Math.min(
                  100,
                  Math.round(
                    (promotionEligibility.conditions.insuredCount.current /
                      promotionEligibility.conditions.insuredCount.target) *
                      100
                  )
                ),
              },
              memberReferrals: {
                current: promotionEligibility.conditions.memberReferrals.current,
                target: promotionEligibility.conditions.memberReferrals.target,
                met: promotionEligibility.conditions.memberReferrals.met,
                percentage: Math.min(
                  100,
                  Math.round(
                    (promotionEligibility.conditions.memberReferrals.current /
                      promotionEligibility.conditions.memberReferrals.target) *
                      100
                  )
                ),
              },
              fpReferrals: {
                current: promotionEligibility.conditions.fpReferrals.current,
                target: promotionEligibility.conditions.fpReferrals.target,
                met: promotionEligibility.conditions.fpReferrals.met,
                percentage: Math.min(
                  100,
                  Math.round(
                    (promotionEligibility.conditions.fpReferrals.current /
                      promotionEligibility.conditions.fpReferrals.target) *
                      100
                  )
                ),
              },
            },
          }
        : null,
    }

    return NextResponse.json({ success: true, member: memberDetail })
  } catch (error) {
    console.error('[TEAM_MEMBER_DETAIL_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'メンバー詳細情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
