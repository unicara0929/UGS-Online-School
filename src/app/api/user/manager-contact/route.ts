import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { getAuthenticatedUser, Roles } from '@/lib/auth/api-helpers'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * マネージャー連絡先情報を取得
 * GET /api/user/manager-contact
 * 権限: FPエイドまたはFP昇格申請が承認されたMEMBER
 */
export async function GET(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const user = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: {
        phone: true,
        lineId: true,
        managerContactConfirmedAt: true,
        fpPromotionApproved: true,
        role: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // FPまたは昇格承認済みかチェック
    if (user.role !== Roles.FP && !user.fpPromotionApproved) {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
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
 * 権限: FPエイドまたはFP昇格申請が承認されたMEMBER
 */
export async function POST(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 現在のユーザー情報を取得
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: {
        email: true,
        role: true,
        fpPromotionApproved: true,
        complianceTestPassed: true,
        fpOnboardingCompleted: true,
        compensationBankAccount: { select: { id: true } }
      }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // FPまたは承認済みMEMBERかチェック（fpPromotionApprovedフラグを使用）
    if (currentUser.role !== Roles.FP && !currentUser.fpPromotionApproved) {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

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

    // オンボーディング完了チェック → FP昇格（承認済みの場合のみ）
    let promoted = false
    if (currentUser.fpPromotionApproved) {
      const allOnboardingComplete =
        currentUser.complianceTestPassed === true &&
        currentUser.fpOnboardingCompleted === true &&
        currentUser.compensationBankAccount !== null
        // managerContactConfirmedAt は今更新したので true とみなす

      if (allOnboardingComplete) {
        // 承認済みの申請を取得（ステータス更新用）
        const approvedApplication = await prisma.fPPromotionApplication.findFirst({
          where: {
            userId: authUser!.id,
            status: 'APPROVED'
          }
        })

        // 全オンボーディング完了 → FPロールに昇格
        await prisma.user.update({
          where: { id: authUser!.id },
          data: {
            role: UserRole.FP,
            fpPromotionApproved: false // 昇格完了後はフラグをリセット
          }
        })

        // 申請ステータスをCOMPLETEDに更新
        if (approvedApplication) {
          await prisma.fPPromotionApplication.update({
            where: { id: approvedApplication.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date()
            }
          })
        }

        // Supabaseのロールも更新
        try {
          const supabaseUser = await supabaseAdmin.auth.admin.listUsers()
          const supaUser = supabaseUser.data.users.find(u => u.email === currentUser.email)

          if (supaUser) {
            await supabaseAdmin.auth.admin.updateUserById(supaUser.id, {
              user_metadata: {
                ...supaUser.user_metadata,
                role: 'fp'
              }
            })
          }
        } catch (supabaseError) {
          console.error('Failed to update Supabase user role:', supabaseError)
        }

        promoted = true
        console.log('All onboarding steps completed, user promoted to FP:', authUser!.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: promoted ? 'オンボーディング完了！FPエイドに昇格しました' : '連絡先情報を保存しました',
      phone: updatedUser.phone,
      lineId: updatedUser.lineId,
      confirmedAt: updatedUser.managerContactConfirmedAt,
      promoted
    })
  } catch (error) {
    console.error('Save manager contact error:', error)
    return NextResponse.json(
      { error: '連絡先情報の保存に失敗しました' },
      { status: 500 }
    )
  }
}
