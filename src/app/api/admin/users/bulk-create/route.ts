import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'
import { UserRole } from '@prisma/client'

interface UserToCreate {
  email: string
  password: string
  name: string
  role: string
}

interface CreateResult {
  email: string
  success: boolean
  memberId?: string
  error?: string
}

/**
 * 管理者がユーザーを一括作成するAPI
 * POST /api/admin/users/bulk-create
 * 権限: 管理者のみ
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const { user: authUser, error: authError } = await getAuthenticatedUser(request)
  if (authError) return authError

  // 管理者権限チェック
  const { error: adminError } = checkAdmin(authUser!.role)
  if (adminError) return adminError

  try {
    const { users } = await request.json() as { users: UserToCreate[] }

    // バリデーション
    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'ユーザーデータが必要です' },
        { status: 400 }
      )
    }

    if (users.length > 100) {
      return NextResponse.json(
        { error: '一度に作成できるユーザーは100人までです' },
        { status: 400 }
      )
    }

    const validRoles = ['MEMBER', 'FP', 'MANAGER', 'ADMIN']
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    const results: CreateResult[] = []
    let successCount = 0
    let failedCount = 0

    // 管理者情報を取得
    const admin = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: { name: true }
    })

    // 現在のユーザー数を取得（会員番号生成用）
    let memberCount = await prisma.user.count()

    for (const userData of users) {
      const { email, password, name, role } = userData

      // 個別バリデーション
      if (!email || !password || !name) {
        results.push({
          email: email || '(未入力)',
          success: false,
          error: 'メールアドレス、パスワード、名前は必須です'
        })
        failedCount++
        continue
      }

      if (password.length < 6) {
        results.push({
          email,
          success: false,
          error: 'パスワードは6文字以上で設定してください'
        })
        failedCount++
        continue
      }

      if (!emailRegex.test(email)) {
        results.push({
          email,
          success: false,
          error: '有効なメールアドレスを入力してください'
        })
        failedCount++
        continue
      }

      const userRole: UserRole = role && validRoles.includes(role) ? role as UserRole : UserRole.MEMBER

      try {
        // 既存ユーザーチェック（Prisma）
        const existingPrismaUser = await prisma.user.findUnique({
          where: { email }
        })

        if (existingPrismaUser) {
          results.push({
            email,
            success: false,
            error: 'このメールアドレスは既に登録されています'
          })
          failedCount++
          continue
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
          email_confirm: true,
          user_metadata: {
            name: name,
            role: userRole,
          },
        })

        if (createError) {
          console.error('Supabase user creation error:', createError)

          if (createError.message.includes('already been registered')) {
            results.push({
              email,
              success: false,
              error: 'このメールアドレスは既に登録されています'
            })
          } else {
            results.push({
              email,
              success: false,
              error: 'ユーザーの作成に失敗しました'
            })
          }
          failedCount++
          continue
        }

        // 会員番号を生成
        memberCount++
        const memberId = `UGS${String(memberCount).padStart(5, '0')}`

        // Prismaユーザーを作成
        const now = new Date()

        const isFPOrAbove = userRole === UserRole.FP || userRole === UserRole.MANAGER || userRole === UserRole.ADMIN
        const newUser = await prisma.user.create({
          data: {
            id: newAuthUser.user.id,
            email: email,
            name: name,
            role: userRole,
            memberId: memberId,
            membershipStatus: 'ACTIVE',
            complianceTestPassed: isFPOrAbove,
            complianceTestPassedAt: isFPOrAbove ? now : null,
            fpOnboardingCompleted: isFPOrAbove,
            fpOnboardingCompletedAt: isFPOrAbove ? now : null,
            managerContactConfirmedAt: isFPOrAbove ? now : null,
          }
        })

        // ロール変更履歴に記録
        await prisma.roleChangeHistory.create({
          data: {
            userId: newUser.id,
            fromRole: UserRole.MEMBER,
            toRole: userRole,
            reason: '管理者による一括ユーザー作成',
            changedBy: authUser!.id,
            changedByName: admin?.name ?? '管理者',
          }
        })

        results.push({
          email,
          success: true,
          memberId: memberId
        })
        successCount++

      } catch (error) {
        console.error('User creation error for', email, ':', error)
        results.push({
          email,
          success: false,
          error: 'ユーザーの作成中にエラーが発生しました'
        })
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: users.length,
        success: successCount,
        failed: failedCount
      },
      results
    })
  } catch (error) {
    console.error('Bulk create users error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
