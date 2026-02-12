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
import {
  sendBusinessCardOrderChatworkNotification,
  sendRegistrationPaymentChatworkNotification,
  sendPaymentFailedChatworkNotification,
  sendCancellationChatworkNotification,
} from '@/lib/chatwork'
import { sendEventConfirmationEmail } from '@/lib/services/email-service'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { ReferralStatus, UserRole } from '@prisma/client'
import Stripe from 'stripe'
// Note: memberId/referralCode generation is now done inline within the transaction
// to prevent race conditions (see handleCheckoutSessionCompleted)

/**
 * checkout.session.completed イベントの処理
 */
export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // イベント支払いの場合
  if (session.metadata?.type === 'event') {
    await handleEventPaymentCompleted(session)
    return
  }

  // 外部参加者イベント支払いの場合
  if (session.metadata?.type === 'external-event') {
    await handleExternalEventPaymentCompleted(session)
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

  // 新規登録かどうかを追跡（Chatwork通知の判定に使用）
  let isNewUserRegistration = false

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
    isNewUserRegistration = true // 新規登録フラグを立てる
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
      // memberId/referralCode生成とユーザー作成を同一トランザクション内で行い、
      // 重複エラー時はリトライすることでレースコンディションを防止
      const MAX_RETRIES = 3
      let user = null
      let lastError: Error | null = null

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          user = await prisma.$transaction(async (tx) => {
            // 1. 既存ユーザーをチェック（既に作成済みなら再利用）
            let existingUser = await tx.user.findUnique({
              where: { id: supabaseUser.user.id }
            })

            if (existingUser) {
              console.log('User already exists, reusing:', existingUser.id)
            } else {
              // 2. トランザクション内でユニークなmemberIdを生成
              // 注意: memberIdは文字列なので、数値として最大値を取得する必要がある
              const allMemberIds = await tx.user.findMany({
                where: { memberId: { startsWith: 'UGS' } },
                select: { memberId: true }
              })

              let maxNumber = 0
              for (const u of allMemberIds) {
                const num = parseInt(u.memberId.replace('UGS', ''), 10)
                if (!isNaN(num) && num > maxNumber) {
                  maxNumber = num
                }
              }
              const memberId = `UGS${(maxNumber + 1).toString().padStart(7, '0')}`

              // 3. トランザクション内でユニークなreferralCodeを生成
              const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
              let referralCode = ''
              for (let i = 0; i < 8; i++) {
                referralCode += chars.charAt(Math.floor(Math.random() * chars.length))
              }
              // 重複チェック（万が一重複していてもP2002で再試行される）

              // 4. ユーザー作成
              existingUser = await tx.user.create({
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
              console.log('Prisma user created in transaction:', existingUser.id, 'memberId:', memberId)
            }

            // 5. サブスクリプションの作成（存在しない場合のみ）
            const existingSubscription = await tx.subscription.findFirst({
              where: { userId: existingUser.id }
            })

            if (!existingSubscription) {
              await tx.subscription.create({
                data: {
                  userId: existingUser.id,
                  stripeCustomerId: session.customer as string,
                  stripeSubscriptionId: session.subscription as string,
                  status: 'ACTIVE',
                }
              })
              console.log('Subscription created in transaction for user:', existingUser.id)
            }

            // 6. 会員ステータスをACTIVEに更新
            existingUser = await tx.user.update({
              where: { id: existingUser.id },
              data: {
                membershipStatus: 'ACTIVE',
                membershipStatusChangedAt: new Date(),
                membershipStatusReason: '決済完了により有効会員に移行'
              }
            })

            // 7. 紹介コードがある場合、紹介レコードを作成
            if (pendingUser.referralCode) {
              const referrer = await tx.user.findUnique({
                where: { referralCode: pendingUser.referralCode },
                select: { id: true, role: true }
              })

              if (referrer && referrer.id !== existingUser.id) {
                const existingReferral = await tx.referral.findUnique({
                  where: {
                    referrerId_referredId: {
                      referrerId: referrer.id,
                      referredId: existingUser.id
                    }
                  }
                })

                if (!existingReferral) {
                  const referralType = referrer.role === 'FP' ? 'FP' : 'MEMBER'
                  await tx.referral.create({
                    data: {
                      referrerId: referrer.id,
                      referredId: existingUser.id,
                      referralType: referralType as any,
                      status: ReferralStatus.PENDING
                    }
                  })
                  console.log('Referral created in transaction:', {
                    referrerId: referrer.id,
                    referredId: existingUser.id
                  })
                }
              }
            }

            // 8. PendingUserを削除
            await tx.pendingUser.delete({
              where: { id: pendingUser.id }
            })
            console.log('PendingUser deleted in transaction:', pendingUser.id)

            return existingUser
          }, {
            timeout: 30000, // 30秒のタイムアウト
            maxWait: 5000,  // 最大5秒待機
          })

          // 成功したらループを抜ける
          break
        } catch (err: any) {
          lastError = err
          // memberIdまたはreferralCodeの重複エラーの場合はリトライ
          if (err.code === 'P2002') {
            const target = err.meta?.target || []
            if (target.includes('memberId') || target.includes('referralCode')) {
              console.log(`Unique constraint violation on ${target}, retrying... (attempt ${attempt + 1}/${MAX_RETRIES})`)
              continue
            }
          }
          // その他のエラーは即座にスロー
          throw err
        }
      }

      // リトライ上限に達した場合、またはユーザーが作成されなかった場合
      if (!user) {
        const errorMessage = lastError?.message || '不明なエラー'
        console.error('Failed to create user after max retries:', errorMessage)
        throw lastError || new Error('ユーザー作成に失敗しました')
      }

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

  // Chatwork通知を送信（新規登録時のみ）
  if (isNewUserRegistration) {
    try {
      // 紹介者名を取得
      let referrerName: string | undefined
      if (pendingUser?.referralCode) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: pendingUser.referralCode },
          select: { name: true },
        })
        if (referrer) {
          referrerName = referrer.name
        }
      }

      await sendRegistrationPaymentChatworkNotification({
        userName: session.metadata?.userName || '',
        email: userEmail || '',
        referrerName,
        registeredAt: new Date(),
      })
    } catch (chatworkError) {
      console.error('Failed to send registration Chatwork notification:', chatworkError)
    }
  }

  // 紹介コードが含まれている場合、紹介を自動登録
  await handleReferralRegistration(session)
}

/**
 * イベント支払い完了の処理
 */
async function handleEventPaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { eventId, userId, registrationId } = session.metadata || {}

  // registrationIdがない場合、stripeSessionIdで検索を試みる
  let regId = registrationId
  if (!regId && session.id) {
    console.log('registrationId not in metadata, searching by stripeSessionId:', session.id)
    const existingRegistration = await prisma.eventRegistration.findFirst({
      where: { stripeSessionId: session.id },
      select: { id: true }
    })
    if (existingRegistration) {
      regId = existingRegistration.id
      console.log('Found registration by stripeSessionId:', regId)
    }
  }

  if (!regId) {
    console.error('Missing registrationId in event payment session metadata and no matching stripeSessionId found')
    // ここではエラーをthrowしない（セッションに紐づく登録がない場合はリトライしても無意味）
    return
  }

  // EventRegistrationを更新: PENDING → PAID
  const registration = await prisma.eventRegistration.update({
    where: { id: regId },
    data: {
      paymentStatus: 'PAID',
      stripePaymentIntentId: session.payment_intent as string,
      paidAmount: session.amount_total || 0,
      paidAt: new Date(),
    },
    include: {
      event: {
        include: {
          schedules: {
            orderBy: { date: 'asc' },
            take: 1,
          }
        }
      },
      user: true,
      schedule: true,
    }
  })

  console.log(`Event payment completed: eventId=${eventId}, userId=${userId}, registrationId=${regId}`)

  // 対象スケジュール（登録スケジュール優先、なければ最初のスケジュール）
  const targetSchedule = registration.schedule || registration.event.schedules[0]

  // イベント参加確定メールを送信
  try {
    await sendEventConfirmationEmail({
      to: registration.user.email,
      userName: registration.user.name,
      eventTitle: registration.event.title,
      eventDate: targetSchedule?.date ? targetSchedule.date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }) : '',
      eventTime: targetSchedule?.time || undefined,
      eventLocation: targetSchedule?.location || undefined,
      venueType: registration.event.venueType,
      eventId: registration.event.id,
    })
    console.log('Event confirmation email sent to:', registration.user.email)
  } catch (emailError) {
    console.error('Failed to send event confirmation email:', emailError)
    // メール送信失敗でも処理は続行
  }
}

/**
 * 外部参加者イベント支払い完了の処理
 */
async function handleExternalEventPaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { eventId, externalRegistrationId } = session.metadata || {}

  // externalRegistrationIdがない場合、stripeSessionIdで検索を試みる
  let registrationId = externalRegistrationId
  if (!registrationId && session.id) {
    console.log('externalRegistrationId not in metadata, searching by stripeSessionId:', session.id)
    const existingRegistration = await prisma.externalEventRegistration.findFirst({
      where: { stripeSessionId: session.id },
      select: { id: true }
    })
    if (existingRegistration) {
      registrationId = existingRegistration.id
      console.log('Found registration by stripeSessionId:', registrationId)
    }
  }

  if (!registrationId) {
    console.error('Missing externalRegistrationId in external event payment session metadata and no matching stripeSessionId found')
    // ここではエラーをthrowしない（セッションに紐づく登録がない場合はリトライしても無意味）
    return
  }

  // ExternalEventRegistrationを更新: PENDING → PAID
  const registration = await prisma.externalEventRegistration.update({
    where: { id: registrationId },
    data: {
      paymentStatus: 'PAID',
      stripePaymentIntentId: session.payment_intent as string,
      paidAmount: session.amount_total || 0,
      paidAt: new Date(),
    },
    include: {
      event: {
        include: {
          schedules: {
            orderBy: { date: 'asc' },
            take: 1,
          }
        }
      },
      schedule: true,
    }
  })

  console.log(`External event payment completed: eventId=${eventId}, registrationId=${registrationId}`)

  // 対象スケジュール（登録スケジュール優先、なければ最初のスケジュール）
  const targetSchedule = registration.schedule || registration.event.schedules[0]

  // 外部参加者への確認メールを送信
  try {
    await sendExternalEventConfirmationEmail({
      to: registration.email,
      name: registration.name,
      eventTitle: registration.event.title,
      eventDate: targetSchedule?.date ?? new Date(),
      eventTime: targetSchedule?.time || undefined,
      eventLocation: targetSchedule?.location || undefined,
      onlineMeetingUrl: targetSchedule?.onlineMeetingUrl || undefined,
    })
    console.log('External event confirmation email sent to:', registration.email)
  } catch (emailError) {
    console.error('Failed to send external event confirmation email:', emailError)
    // メール送信失敗でも処理は続行
  }
}

/**
 * 外部参加者向けイベント確認メール送信
 */
async function sendExternalEventConfirmationEmail(params: {
  to: string
  name: string
  eventTitle: string
  eventDate: Date
  eventTime?: string
  eventLocation?: string
  onlineMeetingUrl?: string
}): Promise<void> {
  const { sendEmail } = await import('@/lib/email')
  const { format } = await import('date-fns')
  const { ja } = await import('date-fns/locale')

  const formattedDate = format(params.eventDate, 'yyyy年M月d日(E)', { locale: ja })
  const subject = `【UGS】イベント参加確定：${params.eventTitle}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
        .event-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .event-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .event-detail { color: #666; margin: 5px 0; }
        .online-link { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196f3; }
        .online-link a { color: #1976d2; text-decoration: none; word-break: break-all; }
        .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">イベント参加確定</h1>
        </div>
        <div class="content">
          <p>${params.name} 様</p>
          <p>以下のイベントへの参加が確定しました。</p>

          <div class="event-info">
            <div class="event-title">${params.eventTitle}</div>
            <div class="event-detail">日時: ${formattedDate}${params.eventTime ? ` ${params.eventTime}` : ''}</div>
            ${params.eventLocation ? `<div class="event-detail">場所: ${params.eventLocation}</div>` : ''}
          </div>

          ${params.onlineMeetingUrl ? `
          <div class="online-link">
            <strong>オンライン参加URL:</strong><br>
            <a href="${params.onlineMeetingUrl}">${params.onlineMeetingUrl}</a>
          </div>
          ` : ''}

          <p>ご参加をお待ちしております。</p>
          <p>ご不明点がございましたら、事務局までお問い合わせください。</p>

          <div class="footer">
            <p>このメールはUGSから自動送信されています。</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({ to: params.to, subject, html })
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
      // 紹介者名を取得
      const businessCardReferral = await prisma.referral.findFirst({
        where: { referredId: updatedOrder.user.id },
        select: { referrer: { select: { name: true } } },
      })

      await sendBusinessCardOrderChatworkNotification({
        userName: updatedOrder.user.name,
        deliveryMethod: updatedOrder.deliveryMethod,
        position: updatedOrder.position,
        qualifications: updatedOrder.qualifications,
        email: updatedOrder.email,
        phoneNumber: updatedOrder.phoneNumber,
        referrerName: businessCardReferral?.referrer?.name,
        // 名刺記載住所
        cardAddress: {
          postalCode: updatedOrder.cardPostalCode,
          prefecture: updatedOrder.cardPrefecture,
          city: updatedOrder.cardCity,
          addressLine1: updatedOrder.cardAddressLine1,
          addressLine2: updatedOrder.cardAddressLine2,
        },
        // 郵送先住所（郵送の場合のみ）
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

      // 会員ステータスを更新（CANCELLATION_PENDING の場合はステータスを維持し、滞納フラグのクリアのみ行う）
      if (subscription.user.membershipStatus === 'CANCELLATION_PENDING') {
        await prisma.user.update({
          where: { id: subscription.userId },
          data: {
            delinquentSince: null // 滞納フラグをクリア
          }
        })
        console.log('Delinquent flag cleared for CANCELLATION_PENDING user (status preserved):', subscription.userId)
      } else {
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

  // Chatwork通知を送信
  try {
    // 紹介者名を取得
    const paymentFailedReferral = await prisma.referral.findFirst({
      where: { referredId: subscription.userId },
      select: { referrer: { select: { name: true } } },
    })

    await sendPaymentFailedChatworkNotification({
      userName: subscription.user.name,
      email: subscription.user.email,
      referrerName: paymentFailedReferral?.referrer?.name,
      failedAt: new Date(),
      amount: invoice.amount_due || 0,
    })
  } catch (chatworkError) {
    console.error('Failed to send payment failed Chatwork notification:', chatworkError)
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

  // Supabaseユーザーを永久banしてログインを不可にする
  try {
    await supabaseAdmin.auth.admin.updateUserById(subscriptionRecord.userId, {
      ban_duration: 'none' // 永久ban
    })
    console.log('Supabase user banned for canceled subscription:', subscriptionRecord.userId)
  } catch (banError) {
    console.error('Failed to ban Supabase user (cancellation processing continues):', banError)
    // ban失敗時もキャンセル処理は続行
  }

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

  // Chatwork通知を送信
  try {
    // 紹介者名を取得
    const cancellationReferral = await prisma.referral.findFirst({
      where: { referredId: subscriptionRecord.userId },
      select: { referrer: { select: { name: true } } },
    })

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const isWithinMinimumPeriod = subscriptionRecord.user.createdAt > sixMonthsAgo

    await sendCancellationChatworkNotification({
      userName: subscriptionRecord.user.name,
      email: subscriptionRecord.user.email,
      referrerName: cancellationReferral?.referrer?.name,
      cancelledAt: new Date(),
      reason: subscriptionRecord.user.cancellationReason || undefined,
      registeredAt: subscriptionRecord.user.createdAt,
      isWithinMinimumPeriod,
    })
  } catch (chatworkError) {
    console.error('Failed to send cancellation Chatwork notification:', chatworkError)
  }
}
