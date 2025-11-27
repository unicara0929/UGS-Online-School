import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// 最低契約期間（月数）
const MINIMUM_CONTRACT_MONTHS = 6

/**
 * 契約解除可能日を計算（登録日 + 6ヶ月）
 * @param createdAt ユーザー登録日
 * @returns 契約解除可能日
 */
function calculateContractEndDate(createdAt: Date): Date {
  const endDate = new Date(createdAt)
  endDate.setMonth(endDate.getMonth() + MINIMUM_CONTRACT_MONTHS)
  return endDate
}

/**
 * 最低契約期間を経過しているかチェック
 * @param createdAt ユーザー登録日
 * @returns 6ヶ月経過している場合true
 */
function hasPassedMinimumContractPeriod(createdAt: Date): boolean {
  const now = new Date()
  const endDate = calculateContractEndDate(createdAt)
  return now >= endDate
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const body = await request.json()
    const { reason, otherReason, continuationOption } = body

    if (!reason || !continuationOption) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    // 認証されたユーザー自身の情報を使用
    const userId = authUser!.id
    const email = authUser!.email

    // ユーザー情報をPrismaから取得（名前と登録日）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, createdAt: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    const name = user?.name || email
    const isWithinMinimumPeriod = !hasPassedMinimumContractPeriod(user.createdAt)
    const contractEndDate = calculateContractEndDate(user.createdAt)

    // 退会申請をデータベースに保存
    const cancelRequest = await prisma.cancelRequest.create({
      data: {
        userId,
        name,
        email,
        reason,
        otherReason: otherReason || null,
        continuationOption,
        isScheduled: isWithinMinimumPeriod,
        contractEndDate: isWithinMinimumPeriod ? contractEndDate : null,
        status: 'PENDING'
      }
    })

    console.log('退会申請を受け付けました:', {
      id: cancelRequest.id,
      userId,
      name,
      email,
      reason,
      continuationOption,
      isWithinMinimumPeriod,
      contractEndDate: isWithinMinimumPeriod ? contractEndDate.toISOString() : null,
      submittedAt: cancelRequest.createdAt.toISOString()
    })

    // 6ヶ月未満の場合：申請は受け付けるが、解約予約として扱う
    if (isWithinMinimumPeriod) {
      const formattedDate = contractEndDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      return NextResponse.json({
        success: true,
        isScheduled: true,
        contractEndDate: contractEndDate.toISOString(),
        message: `退会申請を受け付けました。ご登録から6ヶ月間は契約が継続される期間となっております。契約の解除日は ${formattedDate} となりますので、ご確認ください。`
      })
    }

    // 6ヶ月以上経過：通常の退会処理
    return NextResponse.json({
      success: true,
      isScheduled: false,
      message: '退会申請を受け付けました。運営による確認後、退会処理を実施いたします。'
    })
  } catch (error) {
    console.error('退会申請エラー:', error)
    return NextResponse.json(
      { error: '退会申請の処理に失敗しました' },
      { status: 500 }
    )
  }
}

