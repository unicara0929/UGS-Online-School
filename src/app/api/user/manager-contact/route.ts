import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, Roles } from '@/lib/auth/api-helpers'

/**
 * マネージャー連絡先情報を取得
 * GET /api/user/manager-contact
 * 権限: FPエイドのみ
 */
export async function GET(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // FPロールチェック
    const { allowed, error: roleError } = checkRole(authUser!.role, [Roles.FP])
    if (!allowed) return roleError!

    const user = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: {
        phone: true,
        lineId: true,
        managerContactConfirmedAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      phone: user.phone,
      lineId: user.lineId,
      confirmed: !!user.managerContactConfirmedAt,
      confirmedAt: user.managerContactConfirmedAt,
    })
  } catch (error) {
    console.error('Get manager contact error:', error)
    return NextResponse.json(
      { error: '連絡先情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * マネージャー連絡先情報を保存
 * POST /api/user/manager-contact
 * 権限: FPエイドのみ
 */
export async function POST(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // FPロールチェック
    const { allowed, error: roleError } = checkRole(authUser!.role, [Roles.FP])
    if (!allowed) return roleError!

    const body = await request.json()
    const { phone, lineId } = body

    // 電話番号のバリデーション（必須）
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      return NextResponse.json(
        { error: '電話番号は必須です' },
        { status: 400 }
      )
    }

    // 電話番号の形式チェック（ハイフンあり・なし両方許容）
    const phoneRegex = /^[0-9\-+]+$/
    if (!phoneRegex.test(phone.trim())) {
      return NextResponse.json(
        { error: '有効な電話番号を入力してください' },
        { status: 400 }
      )
    }

    // LINE IDのバリデーション（任意、入力された場合のみ）
    let sanitizedLineId: string | null = null
    if (lineId && typeof lineId === 'string' && lineId.trim() !== '') {
      sanitizedLineId = lineId.trim()
    }

    // ユーザー情報を更新
    const updatedUser = await prisma.user.update({
      where: { id: authUser!.id },
      data: {
        phone: phone.trim(),
        lineId: sanitizedLineId,
        managerContactConfirmedAt: new Date(),
      },
      select: {
        phone: true,
        lineId: true,
        managerContactConfirmedAt: true,
      }
    })

    return NextResponse.json({
      success: true,
      message: '連絡先情報を保存しました',
      phone: updatedUser.phone,
      lineId: updatedUser.lineId,
      confirmedAt: updatedUser.managerContactConfirmedAt,
    })
  } catch (error) {
    console.error('Save manager contact error:', error)
    return NextResponse.json(
      { error: '連絡先情報の保存に失敗しました' },
      { status: 500 }
    )
  }
}
