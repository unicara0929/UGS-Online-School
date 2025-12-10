import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ConsultationType, ContactMethod, ConsultationStatus, NotificationType, NotificationPriority } from '@prisma/client'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { createNotification } from '@/lib/services/notification-service'

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

/**
 * 個別相談の申請
 * POST /api/consultations
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { type, phoneNumber, content, preferredContact, preferredDates, attachmentUrl, attachmentName } = body

    // バリデーション
    if (!type || !phoneNumber || !content || !preferredContact || !preferredDates || preferredDates.length === 0) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    // 相談ジャンルの検証
    if (!Object.values(ConsultationType).includes(type)) {
      return NextResponse.json(
        { error: '無効な相談ジャンルです' },
        { status: 400 }
      )
    }

    // 連絡方法の検証
    if (!Object.values(ContactMethod).includes(preferredContact)) {
      return NextResponse.json(
        { error: '無効な連絡方法です' },
        { status: 400 }
      )
    }

    // 希望日時の検証（未来の日時であること）
    const now = new Date()
    const parsedDates = preferredDates.map((d: string) => new Date(d))
    for (const date of parsedDates) {
      if (date <= now) {
        return NextResponse.json(
          { error: '希望日時は未来の日時を指定してください' },
          { status: 400 }
        )
      }
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: { id: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 個別相談を作成
    const consultation = await prisma.consultation.create({
      data: {
        userId: user.id,
        type: type as ConsultationType,
        phoneNumber,
        content,
        preferredContact: preferredContact as ContactMethod,
        preferredDates: parsedDates,
        attachmentUrl,
        attachmentName,
        status: ConsultationStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // 管理者に通知を送信
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    })

    const typeLabel = CONSULTATION_TYPE_LABELS[type as ConsultationType]
    for (const admin of admins) {
      await createNotification(
        admin.id,
        NotificationType.CONSULTATION_SUBMITTED,
        NotificationPriority.INFO,
        '新しい個別相談の申請',
        `${user.name}さんから${typeLabel}相談の申請がありました。`,
        `/dashboard/admin/consultations/${consultation.id}`
      )
    }

    return NextResponse.json({
      success: true,
      consultation: {
        id: consultation.id,
        type: consultation.type,
        status: consultation.status,
        createdAt: consultation.createdAt,
      }
    })
  } catch (error: any) {
    console.error('個別相談申請エラー:', error)
    return NextResponse.json(
      { error: '個別相談の申請に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 自分の個別相談履歴を取得
 * GET /api/consultations
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const consultations = await prisma.consultation.findMany({
      where: { userId: authUser!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        handler: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json({
      consultations: consultations.map(c => ({
        id: c.id,
        type: c.type,
        typeLabel: CONSULTATION_TYPE_LABELS[c.type],
        content: c.content,
        preferredContact: c.preferredContact,
        preferredDates: c.preferredDates,
        attachmentUrl: c.attachmentUrl,
        attachmentName: c.attachmentName,
        status: c.status,
        completedAt: c.completedAt,
        createdAt: c.createdAt,
        handler: c.handler,
      }))
    })
  } catch (error: any) {
    console.error('個別相談履歴取得エラー:', error)
    return NextResponse.json(
      { error: '個別相談履歴の取得に失敗しました' },
      { status: 500 }
    )
  }
}
