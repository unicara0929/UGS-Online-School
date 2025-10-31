import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, email, reason, otherReason, continuationOption } = body

    if (!userId || !name || !email || !reason || !continuationOption) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    // 退会申請をデータベースに保存
    // まず、退会申請テーブルがあるか確認し、なければ作成
    // ここでは、後でPrismaスキーマに追加する想定で、一時的にログに記録
    console.log('退会申請を受け付けました:', {
      userId,
      name,
      email,
      reason,
      otherReason,
      continuationOption,
      submittedAt: new Date().toISOString()
    })

    // 実際の実装では、prisma.cancelRequest.create() などで保存
    // 例:
    // await prisma.cancelRequest.create({
    //   data: {
    //     userId,
    //     name,
    //     email,
    //     reason,
    //     otherReason,
    //     continuationOption,
    //     status: 'PENDING'
    //   }
    // })

    return NextResponse.json({
      success: true,
      message: '退会申請を受け付けました'
    })
  } catch (error) {
    console.error('退会申請エラー:', error)
    return NextResponse.json(
      { error: '退会申請の処理に失敗しました' },
      { status: 500 }
    )
  }
}

