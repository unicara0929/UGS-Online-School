/**
 * ユーザー登録関連のサービス関数
 * 登録処理のロジックを分離して可読性を向上
 */

import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@prisma/client'
import { generateUniqueReferralCode } from '@/lib/services/referral-code-generator'

/**
 * Supabaseユーザーの作成または取得
 * @param email ユーザーのメールアドレス
 * @param name ユーザーの名前
 * @param password ハッシュ化されたパスワード（PendingUserから取得）
 */
export async function findOrCreateSupabaseUser(email: string, name: string, password: string) {
  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

  if (listError) {
    throw new Error(`Supabaseユーザー一覧の取得に失敗しました: ${listError.message}`)
  }

  const existingUser = existingUsers?.users.find(u => u.email === email)

  if (existingUser) {
    console.log('Using existing Supabase user:', { userId: existingUser.id, email })
    return { user: existingUser }
  }

  // 新規ユーザーを作成（PendingUserから取得したパスワードを使用）
  const { data: newUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: password, // PendingUserから取得したハッシュ化されたパスワードを使用
    user_metadata: {
      name,
      role: 'MEMBER'
    },
    email_confirm: true
  })

  if (supabaseError) {
    throw new Error(`Supabaseユーザー作成に失敗しました: ${supabaseError.message}`)
  }

  console.log('Supabase user created with user-provided password:', { userId: newUser.user.id, email })
  return newUser
}

/**
 * Prismaユーザーの作成または取得
 */
export async function findOrCreatePrismaUser(
  supabaseUserId: string,
  email: string,
  name: string
) {
  const existingPrismaUser = await prisma.user.findUnique({
    where: { id: supabaseUserId }
  })

  if (existingPrismaUser) {
    console.log('Using existing Prisma user:', { userId: existingPrismaUser.id, email })
    return existingPrismaUser
  }

  // ユニークな紹介コードを生成
  const referralCode = await generateUniqueReferralCode()

  // 新規ユーザーを作成
  const user = await prisma.user.create({
    data: {
      id: supabaseUserId,
      email,
      name,
      role: UserRole.MEMBER,
      referralCode
    }
  })
  
  console.log('Prisma user created:', { userId: user.id, email, role: user.role, referralCode })
  return user
}

/**
 * サブスクリプションの作成（既に存在する場合はスキップ）
 */
export async function createSubscriptionIfNotExists(
  userId: string,
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null
): Promise<void> {
  if (!stripeCustomerId || !stripeSubscriptionId) {
    console.warn('No subscription data provided:', { 
      hasStripeCustomerId: !!stripeCustomerId, 
      hasStripeSubscriptionId: !!stripeSubscriptionId 
    })
    return
  }

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
          userId,
          stripeCustomerId,
          stripeSubscriptionId,
          status: 'ACTIVE'
        }
      })
      console.log('Subscription created:', { userId, stripeCustomerId, stripeSubscriptionId })
    } else {
      console.log('Subscription already exists:', { userId, subscriptionId: existingSubscription.id })
    }
  } catch (subError: any) {
    console.error('Failed to create subscription:', subError)
    // サブスクリプション作成失敗でもユーザー作成は続行
  }
}

