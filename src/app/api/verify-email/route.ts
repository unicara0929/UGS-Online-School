import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * メール認証API
 * GET /api/verify-email?token=xxx
 *
 * メール内のリンクからトークンを受け取り、メールアドレスを認証する
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: '認証トークンが必要です' },
        { status: 400 }
      )
    }

    // トークンでPendingUserを検索
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { verificationToken: token }
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: '無効な認証トークンです' },
        { status: 404 }
      )
    }

    // 既に認証済み
    if (pendingUser.emailVerified) {
      // 決済ページへリダイレクト
      const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkout?email=${encodeURIComponent(pendingUser.email)}&name=${encodeURIComponent(pendingUser.name)}&verified=true`
      return NextResponse.redirect(checkoutUrl)
    }

    // トークンの有効期限チェック（24時間）
    if (pendingUser.tokenExpiresAt && pendingUser.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: '認証トークンの有効期限が切れています。再度登録してください。' },
        { status: 410 }
      )
    }

    // メールアドレスを認証済みにする
    await prisma.pendingUser.update({
      where: { id: pendingUser.id },
      data: {
        emailVerified: true,
        verificationToken: null, // トークンをクリア（使い捨て）
        tokenExpiresAt: null,
      }
    })

    console.log(`Email verified for: ${pendingUser.email}`)

    // 決済ページへリダイレクト
    const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkout?email=${encodeURIComponent(pendingUser.email)}&name=${encodeURIComponent(pendingUser.name)}&verified=true`
    return NextResponse.redirect(checkoutUrl)

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'メール認証に失敗しました' },
      { status: 500 }
    )
  }
}
