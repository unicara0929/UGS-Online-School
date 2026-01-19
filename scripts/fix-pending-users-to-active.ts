/**
 * PendingUserにいるが、Stripeで決済済みのユーザーを
 * 正式なUserとして作成するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/fix-pending-users-to-active.ts 4423yoshino@gmail.com --dry-run
 *   npx tsx scripts/fix-pending-users-to-active.ts 4423yoshino@gmail.com
 */

import { PrismaClient, UserRole, ReferralStatus } from '@prisma/client'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const email = process.argv[2]
const isDryRun = process.argv.includes('--dry-run')

async function generateMemberId(): Promise<string> {
  const latestUser = await prisma.user.findFirst({
    where: { memberId: { startsWith: 'UGS' } },
    orderBy: { memberId: 'desc' },
    select: { memberId: true }
  })

  let nextNumber = 1
  if (latestUser?.memberId) {
    const numberPart = latestUser.memberId.replace('UGS', '')
    const currentNumber = parseInt(numberPart, 10)
    if (!isNaN(currentNumber)) {
      nextNumber = currentNumber + 1
    }
  }
  return `UGS${nextNumber.toString().padStart(7, '0')}`
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function main() {
  if (!email) {
    console.error('使用方法: npx tsx scripts/fix-pending-users-to-active.ts <email> [--dry-run]')
    process.exit(1)
  }

  console.log(`=== ${email} のユーザー作成処理 ===`)
  console.log(`モード: ${isDryRun ? 'DRY RUN（確認のみ）' : '実際に実行'}`)
  console.log('')

  // 1. PendingUserを確認
  const pendingUser = await prisma.pendingUser.findFirst({
    where: { email }
  })

  if (!pendingUser) {
    console.log('PendingUserが見つかりません')
    return
  }

  console.log('PendingUser:')
  console.log(`  ID: ${pendingUser.id}`)
  console.log(`  Name: ${pendingUser.name}`)
  console.log(`  Email: ${pendingUser.email}`)
  console.log(`  Created: ${pendingUser.createdAt}`)
  console.log('')

  // 2. 既にUserが存在するか確認
  const existingUser = await prisma.user.findFirst({
    where: { email }
  })

  if (existingUser) {
    console.log('既にUserが存在します:')
    console.log(`  ID: ${existingUser.id}`)
    console.log(`  Status: ${existingUser.membershipStatus}`)
    return
  }

  // 3. Stripeで決済状況を確認
  console.log('Stripeで決済状況を確認...')
  const sessions = await stripe.checkout.sessions.list({
    customer_details: { email },
    limit: 10,
  })

  const paidSession = sessions.data.find(s =>
    s.payment_status === 'paid' && s.mode === 'subscription'
  )

  if (!paidSession) {
    console.log('決済済みのサブスクリプションセッションが見つかりません')
    return
  }

  console.log('決済済みセッション:')
  console.log(`  ID: ${paidSession.id}`)
  console.log(`  Subscription: ${paidSession.subscription}`)
  console.log(`  Customer: ${paidSession.customer}`)
  console.log('')

  // 4. Supabaseユーザーを確認/作成
  console.log('Supabaseユーザーを確認...')
  const { data: { users: supabaseUsers } } = await supabaseAdmin.auth.admin.listUsers()
  let supabaseUser = supabaseUsers.find(u => u.email === email)

  if (supabaseUser) {
    console.log(`Supabaseユーザーが存在: ${supabaseUser.id}`)
  } else {
    console.log('Supabaseユーザーが存在しません')
    if (!isDryRun) {
      // 仮パスワードでSupabaseユーザーを作成
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: pendingUser.name }
      })
      if (error) {
        console.error('Supabaseユーザー作成エラー:', error)
        return
      }
      supabaseUser = data.user
      console.log(`Supabaseユーザーを作成: ${supabaseUser?.id}`)
      console.log(`※ユーザーにパスワードリセットを依頼してください`)
    } else {
      console.log('[DRY RUN] Supabaseユーザー作成をスキップ')
    }
  }

  if (!supabaseUser && isDryRun) {
    console.log('[DRY RUN] 以降の処理をスキップ（Supabaseユーザーが必要）')
    return
  }

  // 5. Prismaユーザーを作成
  console.log('')
  console.log('作成するユーザー:')
  console.log(`  ID: ${supabaseUser?.id}`)
  console.log(`  Email: ${email}`)
  console.log(`  Name: ${pendingUser.name}`)
  console.log('')

  if (isDryRun) {
    console.log('[DRY RUN] ユーザー作成をスキップ')
    return
  }

  // トランザクションで作成（memberIdはトランザクション内で生成）
  const MAX_RETRIES = 3
  let user = null
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      user = await prisma.$transaction(async (tx) => {
        // トランザクション内でユニークなmemberIdを生成
        const latestUser = await tx.user.findFirst({
          where: { memberId: { startsWith: 'UGS' } },
          orderBy: { memberId: 'desc' },
          select: { memberId: true }
        })

        let nextNumber = 1
        if (latestUser?.memberId) {
          const numberPart = latestUser.memberId.replace('UGS', '')
          const currentNumber = parseInt(numberPart, 10)
          if (!isNaN(currentNumber)) {
            nextNumber = currentNumber + 1
          }
        }
        const memberId = `UGS${nextNumber.toString().padStart(7, '0')}`
        const referralCode = generateReferralCode()

        // ユーザー作成
        const newUser = await tx.user.create({
          data: {
            id: supabaseUser!.id,
            email,
            name: pendingUser.name,
            role: UserRole.MEMBER,
            membershipStatus: 'ACTIVE',
            memberId,
            referralCode,
            membershipStatusChangedAt: new Date(),
            membershipStatusReason: '手動修正により有効会員に移行'
          }
        })

        // サブスクリプション作成
        await tx.subscription.create({
          data: {
            userId: newUser.id,
            stripeCustomerId: paidSession.customer as string,
            stripeSubscriptionId: paidSession.subscription as string,
            status: 'ACTIVE',
          }
        })

        // PendingUser削除
        await tx.pendingUser.delete({
          where: { id: pendingUser.id }
        })

        return newUser
      }, { timeout: 30000, maxWait: 5000 })

      // 成功したらループを抜ける
      break
    } catch (err: any) {
      lastError = err
      if (err.code === 'P2002') {
        console.log(`Unique constraint violation, retrying... (attempt ${attempt + 1}/${MAX_RETRIES})`)
        continue
      }
      throw err
    }
  }

  if (!user) {
    console.error('ユーザー作成に失敗しました:', lastError?.message)
    return
  }

  console.log('✅ ユーザー作成完了')
  console.log(`  User ID: ${user.id}`)
  console.log(`  Member ID: ${user.memberId}`)
  console.log(`  Membership Status: ${user.membershipStatus}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
