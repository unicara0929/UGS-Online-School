import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ConsultationType, ConsultationStatus, NotificationType, NotificationPriority } from '@prisma/client'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { createNotification } from '@/lib/services/notification-service'
import { Resend } from 'resend'

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

// Resendインスタンス（遅延初期化）
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * 個別相談詳細を取得（管理者）
 * GET /api/admin/consultations/[id]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) return adminError!

    const { id } = await context.params

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            memberId: true,
            role: true,
          }
        },
        handler: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    if (!consultation) {
      return NextResponse.json(
        { error: '相談が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      consultation: {
        id: consultation.id,
        type: consultation.type,
        typeLabel: CONSULTATION_TYPE_LABELS[consultation.type],
        phoneNumber: consultation.phoneNumber,
        content: consultation.content,
        preferredContact: consultation.preferredContact,
        lineId: consultation.lineId,
        preferredDates: consultation.preferredDates,
        attachmentUrl: consultation.attachmentUrl,
        attachmentName: consultation.attachmentName,
        status: consultation.status,
        statusLabel: STATUS_LABELS[consultation.status],
        adminNotes: consultation.adminNotes,
        completedAt: consultation.completedAt,
        createdAt: consultation.createdAt,
        updatedAt: consultation.updatedAt,
        user: consultation.user,
        handler: consultation.handler,
      }
    })
  } catch (error: any) {
    console.error('個別相談詳細取得エラー:', error)
    return NextResponse.json(
      { error: '個別相談詳細の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 個別相談を更新（管理者）
 * PATCH /api/admin/consultations/[id]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) return adminError!

    const { id } = await context.params
    const body = await request.json()
    const { status, adminNotes } = body

    // 既存の相談を取得
    const existingConsultation = await prisma.consultation.findUnique({
      where: { id },
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

    if (!existingConsultation) {
      return NextResponse.json(
        { error: '相談が見つかりません' },
        { status: 404 }
      )
    }

    // 更新データを構築
    const updateData: any = {}

    if (status !== undefined) {
      if (!Object.values(ConsultationStatus).includes(status)) {
        return NextResponse.json(
          { error: '無効なステータスです' },
          { status: 400 }
        )
      }
      updateData.status = status

      // ステータスが完了になった場合
      if (status === ConsultationStatus.COMPLETED && existingConsultation.status !== ConsultationStatus.COMPLETED) {
        updateData.completedAt = new Date()
        updateData.handledBy = authUser!.id
      }
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes
    }

    // 相談を更新
    const updatedConsultation = await prisma.consultation.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        handler: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    // ステータスが完了になった場合、ユーザーに通知を送信
    if (status === ConsultationStatus.COMPLETED && existingConsultation.status !== ConsultationStatus.COMPLETED) {
      const typeLabel = CONSULTATION_TYPE_LABELS[existingConsultation.type]

      // アプリ内通知
      await createNotification(
        existingConsultation.userId,
        NotificationType.CONSULTATION_COMPLETED,
        NotificationPriority.SUCCESS,
        '個別相談が完了しました',
        `${typeLabel}相談への対応が完了しました。`,
        '/dashboard/consultation/history'
      )

      // メール送信
      try {
        const resend = getResend()
        await resend.emails.send({
          from: 'Unicara Growth Salon <inc@unicara.jp>',
          to: existingConsultation.user.email,
          subject: `【Unicara Growth Salon】${typeLabel}相談の対応が完了しました`,
          html: `
            <p>${existingConsultation.user.name} 様</p>
            <br>
            <p>いつもUnicara Growth Salonをご利用いただきありがとうございます。</p>
            <br>
            <p>ご依頼いただきました「${typeLabel}相談」への対応が完了しましたので、お知らせいたします。</p>
            <br>
            <p>─────────────────</p>
            <p><strong>■ 相談ジャンル</strong><br>${typeLabel}</p>
            <br>
            <p><strong>■ 申請日時</strong><br>${existingConsultation.createdAt.toLocaleString('ja-JP')}</p>
            <br>
            <p><strong>■ 完了日時</strong><br>${new Date().toLocaleString('ja-JP')}</p>
            <p>─────────────────</p>
            <br>
            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            <br>
            <p>今後ともUnicara Growth Salonをよろしくお願いいたします。</p>
          `
        })
      } catch (emailError) {
        console.error('完了通知メール送信エラー:', emailError)
        // メール送信失敗してもエラーにしない
      }
    }

    return NextResponse.json({
      success: true,
      consultation: {
        id: updatedConsultation.id,
        type: updatedConsultation.type,
        typeLabel: CONSULTATION_TYPE_LABELS[updatedConsultation.type],
        status: updatedConsultation.status,
        statusLabel: STATUS_LABELS[updatedConsultation.status],
        adminNotes: updatedConsultation.adminNotes,
        completedAt: updatedConsultation.completedAt,
        user: updatedConsultation.user,
        handler: updatedConsultation.handler,
      }
    })
  } catch (error: any) {
    console.error('個別相談更新エラー:', error)
    return NextResponse.json(
      { error: '個別相談の更新に失敗しました' },
      { status: 500 }
    )
  }
}
