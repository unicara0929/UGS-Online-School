/**
 * ユーザー登録関連のサービス関数
 * 登録処理のロジックを分離して可読性を向上
 */

import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@prisma/client'
import { generateUniqueReferralCode } from '@/lib/services/referral-code-generator'
import { generateMemberId } from '@/lib/services/member-id-generator'

/**
 * Supabaseユーザーの作成または取得
 * @param email ユーザーのメールアドレス
 * @param name ユーザーの名前
 * @param password パスワード（プレーンまたはハッシュ化済み）
 * @param isPlainPassword パスワードがプレーンテキストかどうか
 */
export async function findOrCreateSupabaseUser(
  email: string,
  name: string,
  password: string,
  isPlainPassword: boolean = true
) {
  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

  if (listError) {
    throw new Error(`Supabaseユーザー一覧の取得に失敗しました: ${listError.message}`)
  }

  const existingUser = existingUsers?.users.find(u => u.email === email)

  if (existingUser) {
    console.log('Found existing Supabase user:', { userId: existingUser.id, email })

    // 既存ユーザーが見つかった場合、パスワードと名前を更新する（再登録対応）
    try {
      const updateData: { password?: string; user_metadata: Record<string, unknown> } = {
        user_metadata: {
          ...existingUser.user_metadata,
          name,  // 常に新しい名前で更新
          requiresPasswordReset: !isPlainPassword
        }
      }

      // プレーンパスワードの場合のみパスワードも更新
      if (isPlainPassword) {
        updateData.password = password
      }

      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, updateData)
      console.log('✅ Updated existing Supabase user:', {
        userId: existingUser.id,
        email,
        nameUpdated: existingUser.user_metadata?.name !== name,
        passwordUpdated: isPlainPassword
      })
    } catch (updateError: any) {
      console.error('Failed to update existing user:', updateError)
      throw new Error(`既存ユーザーの更新に失敗しました: ${updateError.message}`)
    }

    // 更新後のユーザー情報を返す（名前が更新されている）
    return { user: { ...existingUser, user_metadata: { ...existingUser.user_metadata, name } } }
  }

  // 新規ユーザーを作成
  if (!isPlainPassword) {
    // ハッシュ化済みパスワードの場合はエラー（互換性のため警告を出すが、一時パスワードでアカウント作成）
    console.warn('⚠️ Hashed password provided for Supabase user creation - creating with temporary password')
    console.warn('⚠️ User will need to reset password. Email:', email)

    // 一時パスワードを生成（32文字のランダム文字列）
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) +
                         Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)

    const { data: newUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      user_metadata: {
        name,
        role: 'MEMBER',
        requiresPasswordReset: true
      },
      email_confirm: true
    })

    if (supabaseError) {
      throw new Error(`Supabaseユーザー作成に失敗しました: ${supabaseError.message}`)
    }

    console.log('⚠️ Supabase user created with temporary password (requires reset):', { userId: newUser.user.id, email })
    return newUser
  }

  // プレーンパスワードでユーザー作成（正常フロー）
  const { data: newUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: password, // プレーンパスワードを使用（Supabaseが自動でハッシュ化）
    user_metadata: {
      name,
      role: 'MEMBER'
    },
    email_confirm: true
  })

  if (supabaseError) {
    throw new Error(`Supabaseユーザー作成に失敗しました: ${supabaseError.message}`)
  }

  console.log('✅ Supabase user created with plain password:', { userId: newUser.user.id, email })
  return newUser
}

/**
 * Prismaユーザーの作成または取得
 * 既存ユーザーの場合は名前を更新する（再登録対応）
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
    // 既存ユーザーの場合、名前が異なれば更新する（再登録時に新しい名前を反映）
    if (existingPrismaUser.name !== name) {
      const updatedUser = await prisma.user.update({
        where: { id: supabaseUserId },
        data: { name }
      })
      console.log('Updated existing Prisma user name:', { userId: updatedUser.id, email, oldName: existingPrismaUser.name, newName: name })
      return updatedUser
    }
    console.log('Using existing Prisma user:', { userId: existingPrismaUser.id, email })
    return existingPrismaUser
  }

  // ユニークな紹介コードを生成
  const referralCode = await generateUniqueReferralCode()

  // ユニークな会員番号を生成
  const memberId = await generateMemberId()

  // 新規ユーザーを作成
  const user = await prisma.user.create({
    data: {
      id: supabaseUserId,
      email,
      name,
      role: UserRole.MEMBER,
      memberId,
      referralCode
    }
  })

  console.log('Prisma user created:', { userId: user.id, email, role: user.role, memberId, referralCode })
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

