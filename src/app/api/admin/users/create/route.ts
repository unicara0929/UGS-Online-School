import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 管理者がユーザーを直接作成するAPI
 * 内部スタッフ用：メールアドレス、パスワード、ロールを指定して作成
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const { user: authUser, error: authError } = await getAuthenticatedUser(request)
  if (authError) return authError

  // 管理者権限チェック
  const { error: adminError } = checkAdmin(authUser!.role)
  if (adminError) return adminError

  try {
    const { email, password, name, role } = await request.json()

    // バリデーション
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'メールアドレス、パスワード、名前は必須です' },
        { status: 400 }
      )
    }

    // パスワードの長さチェック
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上で設定してください' },
        { status: 400 }
      )
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      )
    }

    // ロールの検証
    const validRoles = ['MEMBER', 'FP', 'MANAGER', 'ADMIN']
    const userRole = role && validRoles.includes(role) ? role : 'MEMBER'

    // 既存ユーザーチェック（Prisma）
    const existingPrismaUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingPrismaUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      )
    }

    // 仮登録ユーザーチェック
    const existingPendingUser = await prisma.pendingUser.findUnique({
      where: { email }
    })

    if (existingPendingUser) {
      // 仮登録ユーザーがいる場合は削除して続行
      await prisma.pendingUser.delete({
        where: { email }
      })
    }

    // Supabase認証ユーザーを作成
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // メール認証済みとして作成
      user_metadata: {
        name: name,
        role: userRole,
      },
    })

    if (createError) {
      console.error('Supabase user creation error:', createError)

      // Supabaseで既に存在する場合
      if (createError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'ユーザーの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 会員番号を生成
    const memberCount = await prisma.user.count()
    const memberId = `UGS${String(memberCount + 1).padStart(5, '0')}`

    // Prismaユーザーを作成
    const now = new Date()

    const newUser = await prisma.user.create({
      data: {
        id: newAuthUser.user.id,
        email: email,
        name: name,
        role: userRole,
        memberId: memberId,
        membershipStatus: 'ACTIVE',
        // FPエイド以上のロールで作成した場合はオンボーディングを完了済みに
        complianceTestPassed: userRole === 'FP' || userRole === 'MANAGER' || userRole === 'ADMIN',
        complianceTestPassedAt: (userRole === 'FP' || userRole === 'MANAGER' || userRole === 'ADMIN') ? now : null,
        fpOnboardingCompleted: userRole === 'FP' || userRole === 'MANAGER' || userRole === 'ADMIN',
        fpOnboardingCompletedAt: (userRole === 'FP' || userRole === 'MANAGER' || userRole === 'ADMIN') ? now : null,
        managerContactConfirmedAt: (userRole === 'FP' || userRole === 'MANAGER' || userRole === 'ADMIN') ? now : null,
      }
    })

    // ロール変更履歴に記録
    const admin = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: { name: true }
    })

    await prisma.roleChangeHistory.create({
      data: {
        userId: newUser.id,
        fromRole: 'MEMBER',
        toRole: userRole,
        reason: '管理者によるユーザー作成',
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
      message: 'ユーザーを作成しました。メールアドレスとパスワードを本人に共有してください。'
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
