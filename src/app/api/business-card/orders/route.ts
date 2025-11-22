import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import {
  sendBusinessCardOrderConfirmationEmail,
  sendBusinessCardOrderNotificationToAdmin,
} from '@/lib/email'

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'UGS会員',
  FP: 'FPエイド',
  MANAGER: 'マネージャー',
  ADMIN: '管理者',
}

// 自分の名刺注文履歴を取得
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    // FPエイド以上のみアクセス可能
    if (!user || !['FP', 'MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    const orders = await prisma.businessCardOrder.findMany({
      where: { userId: user.id },
      include: {
        design: {
          select: { id: true, name: true, previewUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, orders })
  } catch (error) {
    console.error('Error fetching business card orders:', error)
    return NextResponse.json(
      { success: false, error: '注文履歴の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 名刺注文を作成
export async function POST(request: NextRequest) {
  try {
    const { user: authUser, error } = await getAuthenticatedUser(request)
    if (error) return error

    // FPエイド以上のみアクセス可能
    if (!authUser || !['FP', 'MANAGER', 'ADMIN'].includes(authUser.role)) {
      return NextResponse.json(
        { success: false, error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    // ユーザー詳細情報を取得
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      designId,
      displayName,
      displayNameKana,
      phoneNumber,
      email,
      postalCode,
      prefecture,
      city,
      addressLine1,
      addressLine2,
      quantity,
      notes,
    } = body

    // バリデーション
    const errors: string[] = []

    if (!designId) errors.push('デザインを選択してください')
    if (!displayName?.trim()) errors.push('表示名を入力してください')
    if (!displayNameKana?.trim()) errors.push('フリガナを入力してください')
    if (!phoneNumber?.trim()) errors.push('電話番号を入力してください')
    if (!email?.trim()) errors.push('メールアドレスを入力してください')
    if (!postalCode?.trim()) errors.push('郵便番号を入力してください')
    if (!prefecture?.trim()) errors.push('都道府県を入力してください')
    if (!city?.trim()) errors.push('市区町村を入力してください')
    if (!addressLine1?.trim()) errors.push('番地を入力してください')

    // フォーマットチェック
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('メールアドレスの形式が正しくありません')
    }
    if (phoneNumber && !/^[\d-]+$/.test(phoneNumber)) {
      errors.push('電話番号の形式が正しくありません')
    }
    if (postalCode && !/^\d{3}-?\d{4}$/.test(postalCode)) {
      errors.push('郵便番号の形式が正しくありません（例: 123-4567）')
    }
    if (displayNameKana && !/^[\u30A0-\u30FF\u3000\s]+$/.test(displayNameKana)) {
      errors.push('フリガナはカタカナで入力してください')
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join('、') },
        { status: 400 }
      )
    }

    // デザインの存在確認
    const design = await prisma.businessCardDesign.findUnique({
      where: { id: designId },
    })

    if (!design || !design.isActive) {
      return NextResponse.json(
        { success: false, error: '選択されたデザインは利用できません' },
        { status: 400 }
      )
    }

    // 注文を作成
    const order = await prisma.businessCardOrder.create({
      data: {
        userId: user.id,
        designId,
        displayName: displayName.trim(),
        displayNameKana: displayNameKana.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        postalCode: postalCode.trim(),
        prefecture: prefecture.trim(),
        city: city.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2?.trim() || null,
        quantity: quantity || 100,
        notes: notes?.trim() || null,
        status: 'PENDING',
      },
      include: {
        design: { select: { name: true } },
      },
    })

    // メール通知を送信（エラーでも処理は継続）
    try {
      // ユーザーへの確認メール
      await sendBusinessCardOrderConfirmationEmail({
        to: user.email,
        userName: user.name,
        orderId: order.id,
        displayName: order.displayName,
        displayNameKana: order.displayNameKana,
        phoneNumber: order.phoneNumber,
        email: order.email,
        postalCode: order.postalCode,
        prefecture: order.prefecture,
        city: order.city,
        addressLine1: order.addressLine1,
        addressLine2: order.addressLine2,
        designName: order.design.name,
        quantity: order.quantity,
      })

      // 管理者への通知
      await sendBusinessCardOrderNotificationToAdmin({
        userName: user.name,
        userEmail: user.email,
        userRole: ROLE_LABELS[user.role] || user.role,
        orderId: order.id,
        displayName: order.displayName,
        designName: order.design.name,
        quantity: order.quantity,
      })
    } catch (emailError) {
      console.error('Failed to send business card order emails:', emailError)
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      message: '名刺注文を受け付けました',
    })
  } catch (error) {
    console.error('Error creating business card order:', error)
    return NextResponse.json(
      { success: false, error: '名刺注文の送信に失敗しました' },
      { status: 500 }
    )
  }
}
