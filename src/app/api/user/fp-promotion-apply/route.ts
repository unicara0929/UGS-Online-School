import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, Roles } from '@/lib/auth/api-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // MEMBERロールチェック
    const { allowed, error: roleError } = checkRole(authUser!.role, [Roles.MEMBER])
    if (!allowed) return roleError!

    // リクエストボディのuserIdを使わず、認証ユーザーのIDを使用
    const userId = authUser!.id

    // 既に申請が存在するか確認
    const existingApplication = await prisma.fPPromotionApplication.findUnique({
      where: { userId },
    })

    if (existingApplication && existingApplication.status !== 'REJECTED' && existingApplication.appliedAt !== null) {
      return NextResponse.json(
        { error: '既に申請が存在します', status: existingApplication.status },
        { status: 400 }
      )
    }

    // 昇格申請を作成または更新
    // 注: 業務委託契約書と身分証明書はメールで別途対応
    const application = await prisma.fPPromotionApplication.upsert({
      where: { userId },
      update: {
        status: 'PENDING',
        appliedAt: new Date(),
      },
      create: {
        userId,
        status: 'PENDING',
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

