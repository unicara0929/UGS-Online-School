/**
 * Stripe Webhookイベントハンドラー
 * 各イベントタイプの処理を分離して可読性を向上
 */

import { stripe } from '@/lib/stripe'
import {
  sendPaymentConfirmationEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
  sendBusinessCardOrderConfirmationEmail,
  sendBusinessCardOrderNotificationToAdmin,
} from '@/lib/email'
import { sendBusinessCardOrderChatworkNotification } from '@/lib/chatwork'
import { sendEventConfirmationEmail } from '@/lib/services/email-service'
import { prisma } from '@/lib/prisma'
import { ReferralStatus, UserRole } from '@prisma/client'
import Stripe from 'stripe'
import { generateUniqueReferralCode } from '@/lib/services/referral-code-generator'
import { generateMemberId } from '@/lib/services/member-id-generator'

/**
 * checkout.session.completed イベントの処理
 */
export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // イベント支払いの場合
  if (session.metadata?.type === 'event') {
    await handleEventPaymentCompleted(session)
    return
  }

  // 名刺注文支払いの場合
  if (session.metadata?.type === 'business-card') {
    await handleBusinessCardPaymentCompleted(session)
    return
  }

  // サブスクリプション支払いの場合
  if (session.mode !== 'subscription') return

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
  const userEmail = session.customer_email || session.metadata?.userEmail
  const userName = session.metadata?.userName

  if (!userEmail) {
    console.error('No user email found in checkout session')
    return
  }

  // 1. PendingUserが存在するか確認（新規登録の場合）
  const pendingUser = await prisma.pendingUser.findUnique({
    where: { email: userEmail },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      plainPassword: true,
      referralCode: true,
    }
  })

  if (pendingUser) {
    // 新規登録フロー: PendingUserからUserを作成
    console.log('New user registration detected, creating user from PendingUser:', userEmail)

    try {
      const {
        findOrCreateSupabaseUser,
        findOrCreatePrismaUser,
        createSubscriptionIfNotExists
      } = await import('@/lib/services/registration-service')

      // パスワードを取得（プレーンパスワード優先）
      const passwordToUse = pendingUser.plainPassword || pendingUser.password
      if (!passwordToUse) {
        console.error('No password found in PendingUser:', userEmail)
        throw new Error('パスワード情報が見つかりません')
      }

      // 【セキュリティ】plainPasswordを即座にクリア（Supabase作成前に）
      // これによりDB漏洩時のリスクを最小化
      await prisma.pendingUser.update({
        where: { id: pendingUser.id },
        data: { plainPassword: null }
      })
      console.log('plainPassword cleared for security:', userEmail)

      // Supabaseユーザーの作成または取得
      const supabaseUser = await findOrCreateSupabaseUser(
        userEmail,
        userName || pendingUser.name,
        passwordToUse,
        !!pendingUser.plainPassword
      )

      // 【トランザクション処理】Prisma側の操作をアトミックに実行
      // トランザクション前にユニークなIDを生成（トランザクション内でのDB読み取りを最小化）
      const referralCode = await generateUniqueReferralCode()
      const memberId = await generateMemberId()

      const user = await prisma.$transaction(async (tx) => {
        // 1. Prismaユーザーの作成または取得
        let user = await tx.user.findUnique({
          where: { id: supabaseUser.user.id }
        })

        if (!user) {
          user = await tx.user.create({
            data: {
              id: supabaseUser.user.id,
              email: userEmail,
              name: userName || pendingUser.name,
              role: UserRole.MEMBER,
              membershipStatus: 'PENDING',
              memberId,
              referralCode,
            }
          })
          console.log('Prisma user created in transaction:', user.id)
        }

        // 2. サブスクリプションの作成（存在しない場合のみ）
        const existingSubscription = await tx.subscription.findFirst({
          where: { userId: user.id }
        })

        if (!existingSubscription) {
          await tx.subscription.create({
            data: {
              userId: user.id,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              status: 'ACTIVE',
            }
          })
          console.log('Subscription created in transaction for user:', user.id)
        }

        // 3. 会員ステータスをACTIVEに更新
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            membershipStatus: 'ACTIVE',
            membershipStatusChangedAt: new Date(),
            membershipStatusReason: '決済完了により有効会員に移行'
          }
        })

        // 4. 紹介コードがある場合、紹介レコードを作成
        if (pendingUser.referralCode) {
          const referrer = await tx.user.findUnique({
            where: { referralCode: pendingUser.referralCode },
            select: { id: true, role: true }
          })

          if (referrer && referrer.id !== user.id) {
            const existingReferral = await tx.referral.findUnique({
              where: {
                referrerId_referredId: {
                  referrerId: referrer.id,
                  referredId: user.id
                }
              }
            })

            if (!existingReferral) {
              const referralType = referrer.role === 'FP' ? 'FP' : 'MEMBER'
              await tx.referral.create({
                data: {
                  referrerId: referrer.id,
                  referredId: user.id,
                  referralType: referralType as any,
                  status: ReferralStatus.PENDING
                }
              })
              console.log('Referral created in transaction:', {
                referrerId: referrer.id,
                referredId: user.id
              })
            }
          }
        }

        // 5. PendingUserを削除
        await tx.pendingUser.delete({
          where: { id: pendingUser.id }
        })
        console.log('PendingUser deleted in transaction:', pendingUser.id)

        return user
      }, {
        timeout: 30000, // 30秒のタイムアウト
        maxWait: 5000,  // 最大5秒待機
      })

      console.log('✅ New user registration completed successfully:', {
        userId: user.id,
        email: userEmail,
        supabaseUserId: supabaseUser.user.id
      })

    } catch (error) {
      console.error('❌ Failed to create user from PendingUser:', error)
      throw error // Webhookをリトライさせる
    }

  } else {
    // 既存ユーザーの決済フロー: 会員ステータスを更新
    try {
      await prisma.user.update({
        where: { email: userEmail },
        data: {
          membershipStatus: 'ACTIVE',
          membershipStatusChangedAt: new Date(),
          membershipStatusReason: '決済完了により有効会員に移行'
        }
      })
      console.log('Membership status updated to ACTIVE for existing user:', userEmail)
    } catch (error) {
      console.error('Failed to update membership status:', error)
      // 既存ユーザーが見つからない場合もエラーにする
      throw error
    }
  }

  // 決済完了メールを送信
  await sendPaymentConfirmationEmail({
    to: userEmail || '',
    userName: session.metadata?.userName || '',
    amount: session.amount_total || 0,
    subscriptionId: subscription.id,
    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login?email=${encodeURIComponent(userEmail || '')}`,
  })

  console.log('Payment confirmation email sent for subscription:', subscription.id)

  // 紹介コードが含まれている場合、紹介を自動登録
  await handleReferralRegistration(session)
}

/**
 * イベント支払い完了の処理
 */
async function handleEventPaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { eventId, userId, registrationId } = session.metadata || {}

  if (!registrationId) {
    console.error('Missing registrationId in event payment session metadata')
    return
  }

  try {
    // EventRegistrationを更新: PENDING → PAID
    const registration = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        paymentStatus: 'PAID',
        stripePaymentIntentId: session.payment_intent as string,
        paidAmount: session.amount_total || 0,
        paidAt: new Date(),
      },
      include: {
        event: true,
        user: true,
      }
    })

    console.log(`Event payment completed: eventId=${eventId}, userId=${userId}, registrationId=${registrationId}`)

    // イベント参加確定メールを送信
    try {
      await sendEventConfirmationEmail({
        to: registration.user.email,
        userName: registration.user.name,
        eventTitle: registration.event.title,
        eventDate: registration.event.date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        }),
        eventTime: registration.event.time || undefined,
        eventLocation: registration.event.location || undefined,
        venueType: registration.event.venueType,
        eventId: registration.event.id,
      })
      console.log('Event confirmation email sent to:', registration.user.email)
    } catch (emailError) {
      console.error('Failed to send event confirmation email:', emailError)
      // メール送信失敗でも処理は続行
    }
  } catch (error) {
    console.error('Failed to update event registration payment status:', error)
  }
}

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'UGS会員',
  FP: 'FPエイド',
  MANAGER: 'マネージャー',
  ADMIN: '管理者',
}

const DELIVERY_LABELS: Record<string, string> = {
  PICKUP: 'UGS本社で手渡し受け取り',
  SHIPPING: 'レターパック郵送',
}

/**
 * 名刺注文支払い完了の処理
 */
async function handleBusinessCardPaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { orderId, userId } = session.metadata || {}

  if (!orderId) {
    console.error('Missing orderId in business card payment session metadata')
    return
  }

  try {
    // 注文を取得
    const order = await prisma.businessCardOrder.findUnique({
      where: { id: orderId },
      include: {
        design: { select: { name: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    if (!order) {
      console.error('Business card order not found:', orderId)
      return
    }

    // 既に支払い完了している場合はスキップ（冪等性）
    if (order.paymentStatus === 'PAID') {
      console.log('Business card order already paid, skipping:', orderId)
      return
    }

    // 注文ステータスを更新
    const updatedOrder = await prisma.businessCardOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'PAID',
        stripePaymentIntentId: session.payment_intent as string,
        stripeSessionId: session.id,
        paidAmount: session.amount_total || 0,
        paidAt: new Date(),
      },
      include: {
        design: { select: { name: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    console.log(`Business card payment completed: orderId=${orderId}, userId=${userId}`)

    // メール通知を送信
    try {
      // ユーザーへの確認メール
      await sendBusinessCardOrderConfirmationEmail({
        to: updatedOrder.user.email,
        userName: updatedOrder.user.name,
        orderId: updatedOrder.id,
        displayName: updatedOrder.displayName,
        displayNameKana: updatedOrder.displayNameKana,
        phoneNumber: updatedOrder.phoneNumber,
        email: updatedOrder.email,
        deliveryMethod: updatedOrder.deliveryMethod,
        deliveryMethodLabel: DELIVERY_LABELS[updatedOrder.deliveryMethod] || updatedOrder.deliveryMethod,
        postalCode: updatedOrder.postalCode,
        prefecture: updatedOrder.prefecture,
        city: updatedOrder.city,
        addressLine1: updatedOrder.addressLine1,
        addressLine2: updatedOrder.addressLine2,
        designName: updatedOrder.design.name,
        quantity: updatedOrder.quantity,
        paidAmount: updatedOrder.paidAmount || 0,
      })

      // 管理者への通知
      await sendBusinessCardOrderNotificationToAdmin({
        userName: updatedOrder.user.name,
        userEmail: updatedOrder.user.email,
        userRole: ROLE_LABELS[updatedOrder.user.role] || updatedOrder.user.role,
        orderId: updatedOrder.id,
        displayName: updatedOrder.displayName,
        deliveryMethod: updatedOrder.deliveryMethod,
        deliveryMethodLabel: DELIVERY_LABELS[updatedOrder.deliveryMethod] || updatedOrder.deliveryMethod,
        designName: updatedOrder.design.name,
        quantity: updatedOrder.quantity,
        paidAmount: updatedOrder.paidAmount || 0,
      })

      console.log('Business card order emails sent to:', updatedOrder.user.email)
    } catch (emailError) {
      console.error('Failed to send business card order emails:', emailError)
      // メール送信失敗でも処理は続行
    }

    // Chatwork通知を送信
    try {
      await sendBusinessCardOrderChatworkNotification({
        userName: updatedOrder.user.name,
        deliveryMethod: updatedOrder.deliveryMethod,
        orderId: updatedOrder.id,
        shippingAddress: updatedOrder.deliveryMethod === 'SHIPPING' ? {
          postalCode: updatedOrder.postalCode,
          prefecture: updatedOrder.prefecture,
          city: updatedOrder.city,
          addressLine1: updatedOrder.addressLine1,
          addressLine2: updatedOrder.addressLine2,
        } : undefined,
      })
    } catch (chatworkError) {
      console.error('Failed to send business card order Chatwork notification:', chatworkError)
      // Chatwork通知失敗でも処理は続行
    }
  } catch (error) {
    console.error('Failed to update business card order payment status:', error)
  }
}

/**
 * 新規ユーザー用の紹介登録処理
 */
async function handleReferralRegistrationForNewUser(
  referralCode: string,
  newUserId: string,
  newUserEmail: string
): Promise<void> {
  try {
    // 紹介コードから紹介者を取得
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, role: true }
    })

    if (!referrer) {
      console.log('Referrer not found for code:', referralCode)
      return
    }

    if (referrer.id === newUserId) {
      console.log('Self-referral detected, skipping')
      return
    }

    // 紹介タイプを決定（紹介者のロールに基づく）
    const referralType = referrer.role === 'FP' ? 'FP' : 'MEMBER'

    // 既存の紹介をチェック
    const existingReferral = await prisma.referral.findUnique({
      where: {
        referrerId_referredId: {
          referrerId: referrer.id,
          referredId: newUserId
        }
      }
    })

    if (!existingReferral) {
      await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: newUserId,
          referralType: referralType as any,
          status: ReferralStatus.PENDING
        }
      })
      console.log('Referral registered for new user:', {
        referralCode,
        referrerId: referrer.id,
        referredId: newUserId,
        referredEmail: newUserEmail,
        referralType
      })
    } else {
      console.log('Referral already exists, skipping:', {
        referrerId: referrer.id,
        referredId: newUserId
      })
    }
  } catch (error) {
    console.error('Failed to register referral for new user:', error)
    // 紹介登録失敗でも処理は続行
  }
}

/**
 * 紹介登録の処理（既存ユーザー用）
 */
async function handleReferralRegistration(session: Stripe.Checkout.Session): Promise<void> {
  const referralCode = session.metadata?.referralCode
  const userEmail = session.customer_email || session.metadata?.userEmail

  if (!referralCode || !userEmail) return

  try {
    // 紹介コードから紹介者を取得
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, role: true }
    })

    if (!referrer) return

    // 被紹介者を取得
    const referred = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, role: true }
    })

    if (!referred || referrer.id === referred.id) return

    // 紹介タイプを決定（紹介者のロールに基づく）
    // FP が紹介した場合は FP_REFERRAL、それ以外は MEMBER_REFERRAL
    const referralType = referrer.role === 'FP' ? 'FP' : 'MEMBER'

    // 既存の紹介をチェック
    const existingReferral = await prisma.referral.findUnique({
      where: {
        referrerId_referredId: {
          referrerId: referrer.id,
          referredId: referred.id
        }
      }
    })

    if (!existingReferral) {
      // 紹介を登録
      await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: referred.id,
          referralType: referralType as any,
          status: ReferralStatus.PENDING
        }
      })
      console.log('Referral registered from checkout:', { referrerId: referrer.id, referredId: referred.id })
    }
  } catch (error) {
    console.error('Failed to register referral from checkout:', error)
    // 紹介登録失敗でも決済処理は続行
  }
}

/**
 * invoice.payment_succeeded イベントの処理
 */
export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log('Monthly payment succeeded for invoice:', invoice.id)

  // サブスクリプションの状態を更新
  const subscriptionId = (invoice as any).subscription
  if (subscriptionId) {
    const subId = typeof subscriptionId === 'string'
      ? subscriptionId
      : subscriptionId.id

    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subId },
      include: { user: true }
    })

    if (subscription) {
      // サブスクリプションステータスを更新
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subId },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null
        }
      })

      // 会員ステータスを ACTIVE に更新（PAST_DUE から復帰）
      await prisma.user.update({
        where: { id: subscription.userId },
        data: {
          membershipStatus: 'ACTIVE',
          membershipStatusChangedAt: new Date(),
          membershipStatusReason: '決済成功により正常状態に復帰',
          delinquentSince: null // 滞納フラグをクリア
        }
      })
      console.log('Membership status updated to ACTIVE for user:', subscription.userId)
    }
  }
}

/**
 * invoice.payment_failed イベントの処理
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log('Payment failed for invoice:', invoice.id)

  // サブスクリプションの状態を更新
  const subscriptionId = (invoice as any).subscription
  if (!subscriptionId) return

  const subId = typeof subscriptionId === 'string'
    ? subscriptionId
    : subscriptionId.id

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subId },
    include: { user: true }
  })

  if (!subscription) return

  // サブスクリプションステータスを更新
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: {
      status: 'PAST_DUE'
    }
  })

  // 会員ステータスを PAST_DUE に更新
  await prisma.user.update({
    where: { id: subscription.userId },
    data: {
      membershipStatus: 'PAST_DUE',
      membershipStatusChangedAt: new Date(),
      membershipStatusReason: '決済失敗により支払い遅延状態に移行',
      delinquentSince: new Date() // 滞納開始日を記録
    }
  })
  console.log('Membership status updated to PAST_DUE for user:', subscription.userId)

  // 決済失敗メールを送信
  try {
    const updateCardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription`
    await sendPaymentFailedEmail({
      to: subscription.user.email,
      userName: subscription.user.name,
      amount: invoice.amount_due || 0,
      invoiceId: invoice.id,
      updateCardUrl
    })
    console.log('Payment failed email sent to:', subscription.user.email)
  } catch (emailError) {
    console.error('Failed to send payment failed email:', emailError)
    // メール送信失敗でも処理は続行
  }
}

/**
 * customer.subscription.deleted イベントの処理
 */
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log('Subscription cancelled:', subscription.id)

  // サブスクリプションの状態を更新
  const subscriptionRecord = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: { user: true }
  })

  if (!subscriptionRecord) return

  // サブスクリプションステータスを更新
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'CANCELED'
    }
  })

  // 会員ステータスを CANCELED に更新
  await prisma.user.update({
    where: { id: subscriptionRecord.userId },
    data: {
      membershipStatus: 'CANCELED',
      membershipStatusChangedAt: new Date(),
      membershipStatusReason: 'サブスクリプションキャンセルにより退会',
      canceledAt: new Date()
    }
  })
  console.log('Membership status updated to CANCELED for user:', subscriptionRecord.userId)

  // キャンセルメールを送信
  try {
    const reactivateUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription`
    await sendSubscriptionCancelledEmail({
      to: subscriptionRecord.user.email,
      userName: subscriptionRecord.user.name,
      subscriptionId: subscription.id,
      reactivateUrl
    })
    console.log('Subscription cancelled email sent to:', subscriptionRecord.user.email)
  } catch (emailError) {
    console.error('Failed to send subscription cancelled email:', emailError)
    // メール送信失敗でも処理は続行
  }
}
