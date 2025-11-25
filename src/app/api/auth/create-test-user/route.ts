import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { generateMemberId } from '@/lib/services/member-id-generator'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Email, password, name, and role are required' },
        { status: 400 }
      )
    }

    // 既存のユーザーをチェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      )
    }

    // Supabaseにユーザーを作成
    const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role: role.toUpperCase()
      },
      email_confirm: true
    })

    if (supabaseError) {
      console.error('Supabase user creation error:', supabaseError)
      return NextResponse.json(
        { error: 'ユーザー作成に失敗しました: ' + supabaseError.message },
        { status: 500 }
      )
    }

    // 会員番号を生成
    const memberId = await generateMemberId()

    // PrismaのUserテーブルにユーザーを作成
    const user = await prisma.user.create({
      data: {
        id: supabaseUser.user.id,
        email,
        name,
        role: role.toUpperCase() as any,
        memberId,
      }
    })

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error: any) {
    // Prismaエラーの場合は専用のハンドラーを使用
    // 根本的な解決: 共通のエラーハンドリング関数を使用して可読性を向上
    if (error.code?.startsWith('P')) {
      const { handlePrismaError } = await import('@/lib/utils/api-error-handlers')
      return handlePrismaError(error)
    }

    const { createServerErrorResponse } = await import('@/lib/utils/api-error-handlers')
    return createServerErrorResponse(error, 'ユーザー作成に失敗しました')
  }
}
