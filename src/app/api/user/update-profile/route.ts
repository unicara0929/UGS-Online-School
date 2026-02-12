import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { name, phone, address, bio, attribute, gender, birthDate, prefecture, profileImageUrl, mbtiType, discType, invoiceNumber } = body || {}

    // 認証ユーザーのIDを使用
    const userId = authUser!.id

    if (!name) {
      return NextResponse.json({ error: '名前は必須です' }, { status: 400 })
    }

    // データベースを更新
    const updateData: any = {
      name,
      phone: phone || null,
      address: address || null,
      bio: bio || null,
      attribute: attribute || null,
      gender: gender || null,
      prefecture: prefecture || null,
      profileImageUrl: profileImageUrl || null,
      mbtiType: mbtiType || null,
      discType: discType || null,
      invoiceNumber: invoiceNumber || null,
    }

    // 生年月日の処理
    if (birthDate) {
      updateData.birthDate = new Date(birthDate)
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    console.log('[PROFILE_UPDATE] Success:', {
      userId,
      name,
      hasImage: !!profileImageUrl,
      at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('プロフィール更新APIエラー:', error)
    return NextResponse.json({
      error: 'プロフィールの更新に失敗しました',
      details: error.message
    }, { status: 500 })
  }
}
