import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendEmailVerification } from '@/lib/services/email-service'

/**
 * 認証メール再送信API
 * POST /api/pending-users/resend-verification
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      )
    }

    // 仮登録ユーザーを検索
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { email }
    })

    if (!pendingUser) {
      // セキュリティのため、存在しない場合も成功レスポンスを返す
      return NextResponse.json({
        success: true,
        message: '認証メールを再送信しました'
      })
    }

    // 既に認証済みの場合
    if (pendingUser.emailVerified) {
      return NextResponse.json({
        success: true,
        message: '既にメール認証は完了しています',
        alreadyVerified: true
      })
    }

    // 新しい認証トークンを生成
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // トークン有効期限（24時間）
    const tokenExpiresAt = new Date()
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24)

    // トークンを更新
    await prisma.pendingUser.update({
      where: { id: pendingUser.id },
      data: {
        verificationToken,
        tokenExpiresAt,
      }
    })

    // メール認証リンクを生成
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verificationLink = `${appUrl}/api/verify-email?token=${verificationToken}`

    // 確認メールを送信
    try {
      await sendEmailVerification({
        to: email,
        userName: pendingUser.name,
        verificationLink,
      })
      console.log(`Verification email resent to: ${email}`)
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError)
      return NextResponse.json(
        { error: 'メール送信に失敗しました。しばらくしてから再度お試しください。' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '認証メールを再送信しました'
    })
  } catch (error: any) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: '再送信処理に失敗しました' },
      { status: 500 }
    )
  }
}
