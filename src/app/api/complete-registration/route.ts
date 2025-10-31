import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, name, stripeCustomerId, stripeSubscriptionId } = await request.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // 仮登録ユーザーを検索
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { email }
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: '仮登録ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // Supabaseにユーザーを作成（パスワードは後でユーザーが設定）
    const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'temp_password_' + Math.random().toString(36).substring(7),
      user_metadata: {
        name,
        role: 'MEMBER'
      },
      email_confirm: true
    })

    if (supabaseError) {
      console.error('Supabase user creation error:', supabaseError)
      return NextResponse.json(
        { error: 'ユーザー作成に失敗しました' },
        { status: 500 }
      )
    }

    // PrismaのUserテーブルにユーザーを作成
    const user = await prisma.user.create({
      data: {
        id: supabaseUser.user.id,
        email,
        name,
        role: 'MEMBER'
      }
    })

    // サブスクリプションを作成
    if (stripeCustomerId && stripeSubscriptionId) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeCustomerId,
          stripeSubscriptionId,
          status: 'ACTIVE'
        }
      })
    }

    // 仮登録ユーザーを削除
    await prisma.pendingUser.delete({
      where: { id: pendingUser.id }
    })

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
