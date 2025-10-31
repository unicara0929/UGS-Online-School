import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

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

    // PrismaのUserテーブルにユーザーを作成
    const user = await prisma.user.create({
      data: {
        id: supabaseUser.user.id,
        email,
        name,
        role: role.toUpperCase() as any,
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
    console.error('Create test user error:', error)
    
    // 重複エラーの場合
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'ユーザー作成に失敗しました: ' + error.message },
      { status: 500 }
    )
  }
}
