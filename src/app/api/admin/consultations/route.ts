import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ConsultationType, ConsultationStatus } from '@prisma/client'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

// 相談ジャンルのラベル
const CONSULTATION_TYPE_LABELS: Record<ConsultationType, string> = {
  LIFE_PLAN: 'ライフプラン',
  HOUSING: '住宅',
  CAREER: '転職',
  RENTAL: '賃貸',
  ORDER_SUIT: 'オーダースーツ作成',
  SOLAR_BATTERY: '太陽光・蓄電池',
  OTHER: 'その他',
}

// ステータスのラベル
const STATUS_LABELS: Record<ConsultationStatus, string> = {
  PENDING: '未対応',
  IN_PROGRESS: '対応中',
  COMPLETED: '完了',
}

/**
 * 個別相談一覧を取得（管理者）
 * GET /api/admin/consultations
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) return adminError!

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ConsultationStatus | null
    const type = searchParams.get('type') as ConsultationType | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // フィルター条件を構築
    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type

    // 相談一覧を取得
    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              memberId: true,
              role: true,
            }
          },
          handler: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      }),
      prisma.consultation.count({ where })
    ])

    // 統計情報を取得
    const [stats, typeStats] = await Promise.all([
      prisma.consultation.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      prisma.consultation.groupBy({
        by: ['type'],
        _count: { type: true }
      })
    ])

    // 統計を整形
    const statusCounts = {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
    }
    for (const stat of stats) {
      statusCounts[stat.status] = stat._count.status
    }

    const typeCounts: Record<string, number> = {}
    for (const stat of typeStats) {
      typeCounts[stat.type] = stat._count.type
    }

    return NextResponse.json({
      consultations: consultations.map(c => ({
        id: c.id,
        type: c.type,
        typeLabel: CONSULTATION_TYPE_LABELS[c.type],
        phoneNumber: c.phoneNumber,
        content: c.content,
        preferredContact: c.preferredContact,
        preferredDates: c.preferredDates,
        attachmentUrl: c.attachmentUrl,
        attachmentName: c.attachmentName,
        status: c.status,
        statusLabel: STATUS_LABELS[c.status],
        adminNotes: c.adminNotes,
        completedAt: c.completedAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        user: c.user,
        handler: c.handler,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: statusCounts.PENDING + statusCounts.IN_PROGRESS + statusCounts.COMPLETED,
        pending: statusCounts.PENDING,
        inProgress: statusCounts.IN_PROGRESS,
        completed: statusCounts.COMPLETED,
        byType: typeCounts,
      }
    })
  } catch (error: any) {
    console.error('個別相談一覧取得エラー:', error)
    return NextResponse.json(
      { error: '個別相談一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
