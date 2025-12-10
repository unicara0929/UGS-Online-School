import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function GET(request: NextRequest) {
  try {
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

    // マネージャーの場合: 担当として割り当てられたFPエイドを取得
    if (userRole === 'MANAGER') {
      const teamMembers = await prisma.user.findMany({
        where: {
          managerId: userId,
          role: 'FP',
        },
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // メンバー情報をフォーマット
      const members = teamMembers.map((member) => {
        const subscription = member.subscriptions[0]
        const fpApplication = member.fpPromotionApplications[0]

        return {
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
        }
      })

      return NextResponse.json({ success: true, members })
    }

    // ADMINの場合: 全FPエイドを取得（従来の紹介ベースの表示も残す）
    const referrals = await prisma.referral.findMany({
      where: {
        referrerId: userId,
        status: 'APPROVED',
      },
      include: {
        referred: {
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // メンバー情報をフォーマット
    const members = referrals.map((referral) => {
      const member = referral.referred
      const subscription = member.subscriptions[0]

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        createdAt: member.createdAt.toISOString(),
        referralType: referral.referralType,
        referralCreatedAt: referral.createdAt.toISOString(),
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
      }
    })

    return NextResponse.json({ success: true, members })
  } catch (error) {
    console.error('[TEAM_MEMBERS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'チームメンバー情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
