import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'
import { customAlphabet } from 'nanoid'

// 紹介コード生成用（英数字大文字のみ、8文字）
const generateReferralCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8)

/**
 * 紹介コードを取得・生成
 * GET /api/user/referral-code
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // ユーザーの現在の紹介コードを取得
    const user = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: { id: true, referralCode: true, email: true, name: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 既に紹介コードがある場合はそれを返す
    if (user.referralCode) {
      return NextResponse.json({
        referralCode: user.referralCode,
        referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/register?ref=${user.referralCode}`
      })
    }

    // 紹介コードがない場合は新規生成
    let newReferralCode: string
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    // ユニークな紹介コードを生成
    while (!isUnique && attempts < maxAttempts) {
      newReferralCode = generateReferralCode()

      // 既存の紹介コードと重複していないか確認
      const existing = await prisma.user.findUnique({
        where: { referralCode: newReferralCode }
      })

      if (!existing) {
        isUnique = true

        // ユーザーに紹介コードを設定
        await prisma.user.update({
          where: { id: user.id },
          data: { referralCode: newReferralCode }
        })

        console.log(`Generated referral code for user ${user.id}:`, newReferralCode)

        return NextResponse.json({
          referralCode: newReferralCode,
          referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/register?ref=${newReferralCode}`
        })
      }

      attempts++
    }

    // 最大試行回数を超えた場合
    return NextResponse.json(
      { error: '紹介コードの生成に失敗しました。もう一度お試しください。' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Get/generate referral code error:', error)
    return NextResponse.json(
      { error: '紹介コードの取得に失敗しました' },
      { status: 500 }
    )
  }
}
