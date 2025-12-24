import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 管理者が仮登録ユーザーを決済スキップで本登録完了にするAPI
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const { user: authUser, error: authError } = await getAuthenticatedUser(request)
  if (authError) return authError

  // 管理者権限チェック
  const { error: adminError } = checkAdmin(authUser!.role)
  if (adminError) return adminError

  try {
    const { pendingUserId, initialRole } = await request.json()

    if (!pendingUserId) {
      return NextResponse.json(
        { error: '仮登録ユーザーIDが必要です' },
        { status: 400 }
      )
    }

    // 仮登録ユーザーを取得
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { id: pendingUserId }
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: '仮登録ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // メール認証が完了しているか確認
    if (!pendingUser.emailVerified) {
      return NextResponse.json(
        { error: 'メール認証が完了していません。先にメール認証を完了してください。' },
        { status: 400 }
      )
    }

    // 既にSupabaseユーザーが存在するか確認
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingSupabaseUser = existingUsers?.users?.find(u => u.email === pendingUser.email)

    if (existingSupabaseUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に本登録されています' },
        { status: 400 }
      )
    }

    // Supabase認証ユーザーを作成
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: pendingUser.email,
      email_confirm: true, // メール認証済みとして作成
      user_metadata: {
        name: pendingUser.name,
        role: initialRole || 'MEMBER',
      },
      password: undefined, // パスワードは後でユーザーが設定
    })

    if (createError) {
      console.error('Supabase user creation error:', createError)
      return NextResponse.json(
        { error: 'ユーザーの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 会員番号を生成
    const memberCount = await prisma.user.count()
    const memberId = `UGS${String(memberCount + 1).padStart(5, '0')}`

    // Prismaユーザーを作成
    const role = initialRole || 'MEMBER'
    const now = new Date()

    const newUser = await prisma.user.create({
      data: {
        id: newAuthUser.user.id,
        email: pendingUser.email,
        name: pendingUser.name,
        role: role,
        memberId: memberId,
        membershipStatus: 'ACTIVE', // 本登録完了 = アクティブ会員
        // 管理者による登録の場合、FPエイドならオンボーディング完了済みに
        complianceTestPassed: role === 'FP' ? true : false,
        complianceTestPassedAt: role === 'FP' ? now : null,
        fpOnboardingCompleted: role === 'FP' ? true : false,
        fpOnboardingCompletedAt: role === 'FP' ? now : null,
        managerContactConfirmedAt: role === 'FP' ? now : null,
      }
    })

    // 仮登録ユーザーを削除
    await prisma.pendingUser.delete({
      where: { id: pendingUserId }
    })

    // パスワードリセットメールを送信（ユーザーがパスワードを設定できるように）
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      pendingUser.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
      }
    )

    if (resetError) {
      console.warn('Password reset email failed:', resetError)
      // パスワードリセットメールの失敗は警告のみ（ユーザー作成は成功しているため）
    }

    // ロール変更履歴に記録
    const admin = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: { name: true }
    })

    await prisma.roleChangeHistory.create({
      data: {
        userId: newUser.id,
        fromRole: 'MEMBER', // 仮登録からの変更なのでMEMBERから
        toRole: role,
        reason: '管理者による決済スキップ本登録',
        changedBy: authUser!.id,
        changedByName: admin?.name ?? '管理者',
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        memberId: newUser.memberId,
      },
      message: '本登録が完了しました。パスワード設定メールを送信しました。'
    })
  } catch (error) {
    console.error('Complete registration error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
