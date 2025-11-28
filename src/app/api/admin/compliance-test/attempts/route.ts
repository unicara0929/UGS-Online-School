import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * コンプライアンステスト受験履歴一覧を取得（管理者）
 * GET /api/admin/compliance-test/attempts
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const passed = searchParams.get('passed')

    const where: any = {}
    if (userId) where.userId = userId
    if (passed !== null) where.isPassed = passed === 'true'

    const attempts = await prisma.complianceTestAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberId: true,
            role: true
          }
        }
      }
    })

    // 統計情報も取得
    const stats = await prisma.complianceTestAttempt.aggregate({
      _count: { _all: true },
      where: { isPassed: true }
    })

    const totalAttempts = await prisma.complianceTestAttempt.count()
    const passedAttempts = stats._count._all

    // ユニークな合格者数
    const passedUsers = await prisma.complianceTestAttempt.groupBy({
      by: ['userId'],
      where: { isPassed: true }
    })

    return NextResponse.json({
      success: true,
      attempts: attempts.map(a => ({
        id: a.id,
        userId: a.userId,
        totalQuestions: a.totalQuestions,
        correctCount: a.correctCount,
        score: a.score,
        isPassed: a.isPassed,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        createdAt: a.createdAt,
        user: a.user
      })),
      stats: {
        totalAttempts,
        passedAttempts,
        passedUsersCount: passedUsers.length
      }
    })
  } catch (error) {
    console.error('Get compliance test attempts error:', error)
    return NextResponse.json(
      { error: 'コンプライアンステスト受験履歴の取得に失敗しました' },
      { status: 500 }
    )
  }
}
