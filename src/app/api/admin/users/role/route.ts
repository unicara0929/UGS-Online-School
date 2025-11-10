import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { appRoleToPrismaRole, stringToAppRole } from '@/lib/utils/role-mapper'

export async function PUT(request: NextRequest) {
  try {
    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'ユーザーIDとロールが必要です' },
        { status: 400 }
      )
    }

    // アプリケーション側のロール型（小文字）に変換して検証
    const appRole = stringToAppRole(role)
    if (!appRole) {
      return NextResponse.json(
        { error: '無効なロールです。有効な値: member, fp, manager, admin' },
        { status: 400 }
      )
    }

    // PrismaのUserRole（大文字）に変換
    const prismaRole = appRoleToPrismaRole(appRole)

    // Prismaでユーザーロールを更新
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { role: prismaRole }
      })
    } catch (prismaError: any) {
      console.error('Prisma user update error:', prismaError)
      // ユーザーが存在しない場合は404を返す
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'ユーザーロールの更新に失敗しました' },
        { status: 500 }
      )
    }

    // Supabaseでユーザーのメタデータを更新（大文字で保存）
    const { error: supabaseError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role: prismaRole }
    })

    if (supabaseError) {
      console.error('Supabase user update error:', supabaseError)
      // Prismaは更新済みなので、警告のみ
      console.warn('Supabase metadata update failed, but Prisma update succeeded')
    }

    return NextResponse.json({ 
      success: true,
      role: appRole // アプリケーション側のロール型（小文字）を返す
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
