import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  findOrCreateSupabaseUser,
  findOrCreatePrismaUser,
  createSubscriptionIfNotExists,
} from '@/lib/services/registration-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, stripeCustomerId, stripeSubscriptionId } = body

    console.log('Complete registration request:', { email, name, hasStripeCustomerId: !!stripeCustomerId, hasStripeSubscriptionId: !!stripeSubscriptionId })

    if (!email || !name) {
      console.error('Missing required fields:', { email: !!email, name: !!name })
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // 仮登録ユーザーを検索
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { email }
    })

    console.log('Pending user lookup:', { email, found: !!pendingUser })

    if (!pendingUser) {
      console.error('Pending user not found for email:', email)
      return NextResponse.json(
        { error: '仮登録ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // PendingUserからパスワードを取得
    if (!pendingUser.password) {
      console.error('Password not found in pending user:', email)
      return NextResponse.json(
        { error: 'パスワード情報が見つかりません' },
        { status: 400 }
      )
    }

    // Supabaseユーザーの作成または取得（PendingUserのパスワードを使用）
    // 根本的な解決: サービス関数を使用してロジックを分離し、可読性を向上
    let supabaseUser
    try {
      supabaseUser = await findOrCreateSupabaseUser(email, name, pendingUser.password)
    } catch (error: any) {
      console.error('Supabase user creation error:', error)
      return NextResponse.json(
        { error: 'ユーザー作成に失敗しました', details: error.message },
        { status: 500 }
      )
    }
    
    const supabaseUserId = supabaseUser.user.id

    // Prismaユーザーの作成または取得
    // 根本的な解決: サービス関数を使用してロジックを分離し、可読性を向上
    const user = await findOrCreatePrismaUser(supabaseUserId, email, name)

    // サブスクリプションの作成（既に存在する場合はスキップ）
    // 根本的な解決: サービス関数を使用してロジックを分離し、可読性を向上
    await createSubscriptionIfNotExists(user.id, stripeCustomerId, stripeSubscriptionId)

    // 仮登録ユーザーを削除
    await prisma.pendingUser.delete({
      where: { id: pendingUser.id }
    })

    console.log('Registration completed successfully:', { userId: user.id, email })

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error: any) {
    console.error('API error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: error.message },
      { status: 500 }
    )
  }
}
