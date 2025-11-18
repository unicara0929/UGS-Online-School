import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

// =====================================
// 定数
// =====================================

/** 管理者権限を持つロール */
const ADMIN_ROLES = ['ADMIN', 'MANAGER'] as const

// =====================================
// ユーザー詳細情報取得 API
// =====================================

/**
 * ユーザー詳細情報取得 API
 * 管理者が特定ユーザーの詳細情報を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 管理者権限チェック
    const adminUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { role: true }
    })

    if (!adminUser || !ADMIN_ROLES.includes(adminUser.role as any)) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const { userId } = await params

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: true,
        referralsAsReferrer: {
          include: {
            referred: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            }
          }
        },
        referralsAsReferred: {
          include: {
            referrer: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // Supabase認証情報を取得
    const { data: supabaseUser } = await supabase.auth.admin.getUserById(userId)

    // 最初のサブスクリプションを取得（通常は1つのみ）
    const subscription = user.subscriptions?.[0] || null

    // Stripe顧客情報を取得（存在する場合）
    let stripeCustomer = null
    if (subscription?.stripeCustomerId) {
      try {
        stripeCustomer = await stripe.customers.retrieve(subscription.stripeCustomerId)
      } catch (error) {
        console.error('Failed to fetch Stripe customer:', error)
      }
    }

    // Stripe請求履歴を取得
    let invoices: any[] = []
    if (subscription?.stripeCustomerId) {
      try {
        const invoicesList = await stripe.invoices.list({
          customer: subscription.stripeCustomerId,
          limit: 10,
        })
        invoices = invoicesList.data
      } catch (error) {
        console.error('Failed to fetch invoices:', error)
      }
    }

    return NextResponse.json({
      user: {
        ...user,
        subscription,
        supabaseAuth: supabaseUser?.user,
        stripeCustomer,
        invoices,
      }
    })
  } catch (error) {
    console.error('User detail API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * ユーザー情報更新 API
 * 管理者が特定ユーザーの情報を更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 管理者権限チェック
    const adminUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { role: true }
    })

    if (!adminUser || !ADMIN_ROLES.includes(adminUser.role as any)) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const { userId } = await params
    const body = await request.json()
    const { membershipStatus, membershipStatusReason, role, name, email } = body

    // ユーザー情報を更新
    const updateData: any = {}

    if (membershipStatus) {
      updateData.membershipStatus = membershipStatus
      updateData.membershipStatusChangedAt = new Date()
      updateData.membershipStatusReason = membershipStatusReason || `管理者による変更 (${authUser.email})`
      updateData.membershipStatusChangedBy = authUser.email
    }

    if (role) {
      updateData.role = role
    }

    if (name !== undefined) {
      updateData.name = name
    }

    if (email !== undefined) {
      updateData.email = email
      // Supabaseの認証メールも更新
      try {
        await supabase.auth.admin.updateUserById(userId, {
          email: email
        })
      } catch (error) {
        console.error('Failed to update Supabase auth email:', error)
        // エラーでも処理は継続（Prismaの更新は行う）
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })
  } catch (error) {
    console.error('User update API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
