import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * メール認証共通処理
 */
async function handleVerification(token: string | null, email: string | null = null) {
  // トークンもメールもない場合はエラー
  if (!token && !email) {
    return NextResponse.json(
      { error: '認証トークンまたはメールアドレスが必要です' },
      { status: 400 }
    )
  }

  let pendingUser = null

  // トークンがある場合はトークンで検索
  if (token) {
    pendingUser = await prisma.pendingUser.findUnique({
      where: { verificationToken: token }
    })
  }

  // トークンで見つからない場合、またはメールアドレスが指定されている場合
  // メールアドレスで検索して、既に認証済みかどうかを確認
  if (!pendingUser && email) {
    pendingUser = await prisma.pendingUser.findUnique({
      where: { email }
    })

    // 既に認証済みのユーザーが見つかった場合は決済ページへリダイレクト
    if (pendingUser && pendingUser.emailVerified) {
      const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkout?email=${encodeURIComponent(pendingUser.email)}&name=${encodeURIComponent(pendingUser.name)}&verified=true`
      return NextResponse.redirect(checkoutUrl)
    }
  }

  if (!pendingUser) {
    // トークンが無効で、メールでも見つからない場合
    // 無効なトークンページへリダイレクト（再送信オプション付き）
    const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email-error?reason=invalid_token`
    return NextResponse.redirect(errorUrl)
  }

  // 既に認証済み
  if (pendingUser.emailVerified) {
    // 決済ページへリダイレクト
    const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkout?email=${encodeURIComponent(pendingUser.email)}&name=${encodeURIComponent(pendingUser.name)}&verified=true`
    return NextResponse.redirect(checkoutUrl)
  }

  // トークンの有効期限チェック（24時間）
  if (pendingUser.tokenExpiresAt && pendingUser.tokenExpiresAt < new Date()) {
    // 有効期限切れページへリダイレクト（再送信オプション付き）
    const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email-error?reason=expired&email=${encodeURIComponent(pendingUser.email)}`
    return NextResponse.redirect(errorUrl)
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

  console.log('Email verified for pending user:', { id: pendingUser.id })

  // 決済ページへリダイレクト
  const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkout?email=${encodeURIComponent(pendingUser.email)}&name=${encodeURIComponent(pendingUser.name)}&verified=true`
  return NextResponse.redirect(checkoutUrl)
}

/**
 * メール認証API
 * GET /api/verify-email?token=xxx
 * GET /api/verify-email?email=xxx（既に認証済みの場合用）
 *
 * メール内のリンクからトークンを受け取り、メールアドレスを認証する
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')
    return await handleVerification(token, email)
  } catch (error) {
    console.error('Email verification error:', error)
    // エラーページへリダイレクト
    const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email-error?reason=error`
    return NextResponse.redirect(errorUrl)
  }
}

/**
 * メール認証API（POST対応）
 * POST /api/verify-email
 * Body: { token: string, email?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = body.token
    const email = body.email
    return await handleVerification(token, email)
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'メール認証に失敗しました' },
      { status: 500 }
    )
  }
}
