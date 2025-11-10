import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@prisma/client'

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

    // Supabaseにユーザーが既に存在するか確認
    let supabaseUser
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    const existingUser = existingUsers?.users.find(u => u.email === email)
    
    if (existingUser) {
      // 既存のユーザーを使用
      console.log('Using existing Supabase user:', { userId: existingUser.id, email })
      supabaseUser = { user: existingUser }
    } else {
      // 新規ユーザーを作成
      const { data: newUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
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
          { error: 'ユーザー作成に失敗しました', details: supabaseError.message },
          { status: 500 }
        )
      }

      supabaseUser = newUser
      console.log('Supabase user created:', { userId: supabaseUser.user.id, email })
    }

    const supabaseUserId = supabaseUser.user.id

    // PrismaのUserテーブルに既にユーザーが存在するか確認
    let user
    const existingPrismaUser = await prisma.user.findUnique({
      where: { id: supabaseUserId }
    })

    if (existingPrismaUser) {
      // 既存のユーザーを使用
      console.log('Using existing Prisma user:', { userId: existingPrismaUser.id, email })
      user = existingPrismaUser
    } else {
      // 紹介コードを生成（8文字のランダム文字列）
      const generateReferralCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 0, O, I, 1を除外
        let code = ''
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
      }

      let referralCode = generateReferralCode()
      let isUnique = false
      let attempts = 0
      const maxAttempts = 10

      // ユニークな紹介コードを生成（最大10回試行）
      while (!isUnique && attempts < maxAttempts) {
        const existing = await prisma.user.findUnique({
          where: { referralCode }
        })
        if (!existing) {
          isUnique = true
        } else {
          referralCode = generateReferralCode()
          attempts++
        }
      }

      if (!isUnique) {
        console.error('Failed to generate unique referral code after', maxAttempts, 'attempts')
        // フォールバック: UUIDベースのコード
        referralCode = `REF${supabaseUserId.substring(0, 8).toUpperCase()}`
      }

      // 新規ユーザーを作成
      user = await prisma.user.create({
        data: {
          id: supabaseUserId,
          email,
          name,
          role: UserRole.MEMBER,
          referralCode
        }
      })
      console.log('Prisma user created:', { userId: user.id, email, role: user.role, referralCode })
    }

    // サブスクリプションを作成（既に存在する場合はスキップ）
    if (stripeCustomerId && stripeSubscriptionId) {
      try {
        const existingSubscription = await prisma.subscription.findFirst({
          where: {
            OR: [
              { stripeCustomerId },
              { stripeSubscriptionId }
            ]
          }
        })

        if (!existingSubscription) {
          await prisma.subscription.create({
            data: {
              userId: user.id,
              stripeCustomerId,
              stripeSubscriptionId,
              status: 'ACTIVE'
            }
          })
          console.log('Subscription created:', { userId: user.id, stripeCustomerId, stripeSubscriptionId })
        } else {
          console.log('Subscription already exists:', { userId: user.id, subscriptionId: existingSubscription.id })
        }
      } catch (subError: any) {
        console.error('Failed to create subscription:', subError)
        // サブスクリプション作成失敗でもユーザー作成は続行
      }
    } else {
      console.warn('No subscription data provided:', { hasStripeCustomerId: !!stripeCustomerId, hasStripeSubscriptionId: !!stripeSubscriptionId })
    }

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
