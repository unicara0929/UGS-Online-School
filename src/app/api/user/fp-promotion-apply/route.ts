import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      )
    }

    // 認証チェック（簡易版 - 実際にはSupabaseのセッションを使用）
    // TODO: 適切な認証を実装

    // ユーザーが存在するか確認
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 既に申請が存在するか確認
    const existingApplication = await prisma.fPPromotionApplication.findUnique({
      where: { userId },
    })

    if (existingApplication && existingApplication.status !== 'REJECTED') {
      return NextResponse.json(
        { error: '既に申請が存在します', status: existingApplication.status },
        { status: 400 }
      )
    }

    // 身分証がアップロードされているか確認
    if (!existingApplication?.idDocumentUrl) {
      return NextResponse.json(
        { error: '身分証のアップロードが必要です' },
        { status: 400 }
      )
    }

    // 昇格申請を作成または更新
    const application = await prisma.fPPromotionApplication.upsert({
      where: { userId },
      update: {
        status: 'PENDING',
        appliedAt: new Date(),
      },
      create: {
        userId,
        status: 'PENDING',
        idDocumentUrl: existingApplication.idDocumentUrl,
        appliedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        appliedAt: application.appliedAt,
      },
    })
  } catch (error: any) {
    console.error('Error submitting FP promotion application:', error)
    return NextResponse.json(
      { error: '申請の送信に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}

