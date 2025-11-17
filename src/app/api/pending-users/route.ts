import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // 仮登録ユーザーを作成（紹介コードとハッシュ化されたパスワードも保存）
    const pendingUser = await prisma.pendingUser.create({
      data: {
        email,
        name,
        password, // ハッシュ化されたパスワードを保存
        referralCode: referralCode || null, // 紹介コードがあれば保存
      }
    })

    // 紹介コードがある場合、ログに記録
    if (referralCode) {
      console.log(`Pending user created with referral code: ${referralCode}`, {
        email,
        name
      })
    }

    return NextResponse.json({ 
      success: true, 
      pendingUser: {
        id: pendingUser.id,
        email: pendingUser.email,
        name: pendingUser.name,
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
