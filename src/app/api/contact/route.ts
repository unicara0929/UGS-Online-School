import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { sendContactConfirmationEmail, sendContactNotificationToAdmin } from '@/lib/email'

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'UGS会員',
  FP: 'FPエイド',
  MANAGER: 'マネージャー',
  ADMIN: '管理者',
}

// お問い合わせ送信
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error } = await getAuthenticatedUser(request)
    if (error) return error

    // ユーザー詳細情報を取得
    const user = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { type, subject, message } = body

    // バリデーション
    if (!type) {
      return NextResponse.json(
        { success: false, error: 'お問い合わせ種別を選択してください' },
        { status: 400 }
      )
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'お問い合わせ内容を入力してください' },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'お問い合わせ内容は2000文字以内で入力してください' },
        { status: 400 }
      )
    }

    // 有効なタイプかチェック
    const validTypes = ['ACCOUNT', 'PAYMENT', 'CONTENT', 'TECHNICAL', 'OTHER']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: '無効なお問い合わせ種別です' },
        { status: 400 }
      )
    }

    // お問い合わせを保存
    const submission = await prisma.contactSubmission.create({
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        type: type as any,
        subject: subject || null,
        message: message.trim(),
        status: 'PENDING',
      },
    })

    // メール通知を送信（エラーでも処理は継続）
    try {
      // ユーザーへの自動返信
      await sendContactConfirmationEmail({
        to: user.email,
        userName: user.name,
        type,
        subject: subject || null,
        message: message.trim(),
        submissionId: submission.id,
      })

      // 管理者への通知
      await sendContactNotificationToAdmin({
        userName: user.name,
        userEmail: user.email,
        userRole: ROLE_LABELS[user.role] || user.role,
        type,
        subject: subject || null,
        message: message.trim(),
        submissionId: submission.id,
      })
    } catch (emailError) {
      console.error('Failed to send contact emails:', emailError)
      // メール送信失敗でもお問い合わせ自体は成功として扱う
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: 'お問い合わせを受け付けました',
    })
  } catch (error) {
    console.error('Error submitting contact form:', error)
    return NextResponse.json(
      { success: false, error: 'お問い合わせの送信に失敗しました' },
      { status: 500 }
    )
  }
}

// 自分のお問い合わせ履歴取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    const submissions = await prisma.contactSubmission.findMany({
      where: {
        userId: user!.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    })

    return NextResponse.json({
      success: true,
      submissions,
    })
  } catch (error) {
    console.error('Error fetching contact submissions:', error)
    return NextResponse.json(
      { success: false, error: 'お問い合わせ履歴の取得に失敗しました' },
      { status: 500 }
    )
  }
}
