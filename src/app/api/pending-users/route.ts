import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendEmailVerification } from '@/lib/services/email-service'
import {
  createValidationErrorResponse,
  createConflictErrorResponse,
  createServerErrorResponse,
  handlePrismaError,
} from '@/lib/utils/api-error-handlers'

export async function POST(request: NextRequest) {
  try {
    const { email, name, password, referralCode } = await request.json()

    if (!email || !name || !password) {
      return createValidationErrorResponse('Email, name, and password are required')
    }

    // 既存の仮登録ユーザーをチェック
    const existingPendingUser = await prisma.pendingUser.findUnique({
      where: { email }
    })

    if (existingPendingUser) {
      return NextResponse.json({
        error: 'このメールアドレスは既に仮登録されています',
        errorCode: 'ALREADY_REGISTERED_PENDING',
        email
      }, { status: 409 })
    }

    // 既存の正式ユーザーをチェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({
        error: 'このメールアドレスは既に登録されています',
        errorCode: 'ALREADY_REGISTERED',
        email
      }, { status: 409 })
    }

    // パスワードをサーバーサイドでハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10)

    // メール認証トークンを生成（ランダム32バイト）
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // トークン有効期限（24時間）
    const tokenExpiresAt = new Date()
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24)

    // 仮登録ユーザーを作成（紹介コードとパスワードを保存）
    const pendingUser = await prisma.pendingUser.create({
      data: {
        email,
        name,
        password: hashedPassword, // ハッシュ化されたパスワードを保存
        plainPassword: password,  // プレーンパスワードも一時保存（Supabaseユーザー作成用）
        referralCode: referralCode || null, // 紹介コードがあれば保存
        verificationToken,
        tokenExpiresAt,
        emailVerified: false,
      }
    })

    // 紹介コードがある場合、ログに記録
    if (referralCode) {
      console.log('Pending user created with referral code')
    }

    // メール認証リンクを生成
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verificationLink = `${appUrl}/api/verify-email?token=${verificationToken}`

    // 確認メールを送信
    try {
      await sendEmailVerification({
        to: email,
        userName: name,
        verificationLink,
      })
      console.log('Verification email sent')
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // メール送信失敗してもユーザー登録は成功させる
      // ユーザーは後で再送リクエストできる
    }

    return NextResponse.json({
      success: true,
      pendingUser: {
        id: pendingUser.id,
        email: pendingUser.email,
        name: pendingUser.name,
        emailVerified: pendingUser.emailVerified,
        createdAt: pendingUser.createdAt
      }
    })
  } catch (error: any) {
    // Prismaエラーの場合は専用のハンドラーを使用
    if (error.code?.startsWith('P')) {
      return handlePrismaError(error)
    }
    
    return createServerErrorResponse(error)
  }
}
