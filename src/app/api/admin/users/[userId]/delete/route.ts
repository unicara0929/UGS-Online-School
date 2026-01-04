import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 本登録ユーザー削除 API
 * DELETE /api/admin/users/[userId]/delete
 * 権限: 管理者のみ
 *
 * ユーザーとその関連データをすべて削除する
 * Supabase認証ユーザーも削除する
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者権限チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { userId } = await context.params

    // 自分自身は削除できない
    if (userId === authUser!.id) {
      return NextResponse.json(
        { error: '自分自身を削除することはできません' },
        { status: 400 }
      )
    }

    // 削除対象のユーザーを確認
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 管理者ユーザーは削除できない（セキュリティ対策）
    if (targetUser.role === 'ADMIN') {
      return NextResponse.json(
        { error: '管理者ユーザーは削除できません' },
        { status: 403 }
      )
    }

    // トランザクションで関連データを削除
    await prisma.$transaction(async (tx) => {
      // 関連データを削除（外部キー制約のある順序で削除）

      // 1. イベント参加関連
      await tx.eventRegistration.deleteMany({ where: { userId } })
      await tx.eventSurveyResponse.deleteMany({ where: { userId } })

      // 2. 紹介関連
      await tx.referral.deleteMany({ where: { referrerId: userId } })
      await tx.referral.deleteMany({ where: { referredId: userId } })

      // 3. LP面談関連
      await tx.lPMeeting.deleteMany({ where: { memberId: userId } })
      await tx.lPMeeting.deleteMany({ where: { fpId: userId } })

      // 4. FP関連
      await tx.fPPromotionApplication.deleteMany({ where: { userId } })

      // 5. 学習進捗関連
      await tx.courseProgress.deleteMany({ where: { userId } })
      await tx.complianceTestAttempt.deleteMany({ where: { userId } })

      // 6. サブスクリプション・決済関連
      await tx.subscription.deleteMany({ where: { userId } })

      // 7. 報酬・銀行口座関連
      await tx.bankAccount.deleteMany({ where: { userId } })
      await tx.compensation.deleteMany({ where: { userId } })

      // 8. 業務委託契約関連
      await tx.contract.deleteMany({ where: { userId } })

      // 9. マネージャー関連（このユーザーが担当しているメンバーのmanagerIdをnullに）
      await tx.user.updateMany({
        where: { managerId: userId },
        data: { managerId: null }
      })

      // 10. ロール変更履歴・会員ステータス履歴
      await tx.roleChangeHistory.deleteMany({ where: { userId } })
      await tx.roleChangeHistory.deleteMany({ where: { changedBy: userId } })
      await tx.membershipStatusHistory.deleteMany({ where: { userId } })

      // 11. アンケート回答
      await tx.surveySubmission.deleteMany({ where: { userId } })

      // 12. 通知関連
      await tx.notification.deleteMany({ where: { userId } })
      await tx.userNotificationRead.deleteMany({ where: { userId } })

      // 13. コンテンツ閲覧履歴
      await tx.userCategoryView.deleteMany({ where: { userId } })
      await tx.userContentView.deleteMany({ where: { userId } })

      // 14. 名刺注文
      await tx.businessCardOrder.deleteMany({ where: { userId } })

      // 15. お問い合わせ
      await tx.contactSubmission.deleteMany({ where: { userId } })

      // 16. 個別相談
      await tx.consultation.deleteMany({ where: { userId } })

      // 17. 全体MTG免除申請
      await tx.mtgExemption.deleteMany({ where: { userId } })

      // 18. 基本テスト結果
      await tx.basicTestResult.deleteMany({ where: { userId } })

      // 19. 退会申請
      await tx.cancelRequest.deleteMany({ where: { userId } })

      // 20. マネージャー売上・査定
      await tx.managerMonthlySales.deleteMany({ where: { userId } })
      await tx.managerAssessment.deleteMany({ where: { userId } })

      // 21. メールログ
      await tx.emailLog.deleteMany({ where: { userId } })

      // 22. 昇格申請
      await tx.promotionApplication.deleteMany({ where: { userId } })

      // 23. 最後にユーザー本体を削除
      await tx.user.delete({ where: { id: userId } })
    })

    // Supabase認証ユーザーを削除
    try {
      const { error: supabaseError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (supabaseError) {
        console.error('Supabase user deletion error:', supabaseError)
        // Prismaの削除は成功しているので、警告ログのみ
        console.warn('User deleted from Prisma but Supabase deletion failed')
      }
    } catch (supabaseErr) {
      console.error('Supabase deletion exception:', supabaseErr)
      // 続行
    }

    return NextResponse.json({
      success: true,
      message: `ユーザー「${targetUser.name}」を削除しました`
    })
  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: 'ユーザーの削除に失敗しました' },
      { status: 500 }
    )
  }
}
