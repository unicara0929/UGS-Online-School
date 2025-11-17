import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

/**
 * デバッグ用: SupabaseとPrismaのユーザー数を比較
 * GET /api/admin/debug/users-comparison
 */
export async function GET(request: NextRequest) {
  try {
    // Supabase Auth Usersを取得
    const { data: supabaseData, error: supabaseError } = await supabaseAdmin.auth.admin.listUsers()
    if (supabaseError) {
      throw new Error(`Supabase users fetch error: ${supabaseError.message}`)
    }

    // Prisma Usersを取得
    const prismaUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    })

    // Prisma PendingUsersを取得
    const pendingUsers = await prisma.pendingUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      }
    })

    // Supabaseユーザーのマップを作成
    const supabaseUsersMap = new Map(
      supabaseData.users.map(user => [user.id, {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || '名前なし',
        createdAt: user.created_at,
      }])
    )

    // Prismaユーザーのマップを作成
    const prismaUsersMap = new Map(
      prismaUsers.map(user => [user.id, user])
    )

    // 不一致を検出
    const onlyInSupabase: any[] = []
    const onlyInPrisma: any[] = []
    const inBoth: any[] = []
    const nameMismatch: any[] = []

    // Supabaseにのみ存在するユーザーを検出
    supabaseData.users.forEach(supabaseUser => {
      const prismaUser = prismaUsersMap.get(supabaseUser.id)
      if (!prismaUser) {
        onlyInSupabase.push({
          id: supabaseUser.id,
          email: supabaseUser.email,
          supabaseName: supabaseUser.user_metadata?.name || '名前なし',
          createdAt: supabaseUser.created_at,
        })
      } else {
        inBoth.push({
          id: supabaseUser.id,
          email: supabaseUser.email,
          supabaseName: supabaseUser.user_metadata?.name || '名前なし',
          prismaName: prismaUser.name,
          prismaRole: prismaUser.role,
        })

        // 名前の不一致をチェック
        const supabaseName = supabaseUser.user_metadata?.name || ''
        if (supabaseName !== prismaUser.name) {
          nameMismatch.push({
            id: supabaseUser.id,
            email: supabaseUser.email,
            supabaseName: supabaseName,
            prismaName: prismaUser.name,
          })
        }
      }
    })

    // Prismaにのみ存在するユーザーを検出
    prismaUsers.forEach(prismaUser => {
      if (!supabaseUsersMap.has(prismaUser.id)) {
        onlyInPrisma.push({
          id: prismaUser.id,
          email: prismaUser.email,
          name: prismaUser.name,
          role: prismaUser.role,
          createdAt: prismaUser.createdAt,
        })
      }
    })

    return NextResponse.json({
      summary: {
        supabaseCount: supabaseData.users.length,
        prismaCount: prismaUsers.length,
        pendingCount: pendingUsers.length,
        inBothCount: inBoth.length,
        onlyInSupabaseCount: onlyInSupabase.length,
        onlyInPrismaCount: onlyInPrisma.length,
        nameMismatchCount: nameMismatch.length,
      },
      details: {
        onlyInSupabase,
        onlyInPrisma,
        nameMismatch,
        inBoth: inBoth.slice(0, 10), // 最初の10件のみ
        pendingUsers: pendingUsers.map(p => ({
          id: p.id,
          email: p.email,
          name: p.name,
          createdAt: p.createdAt,
        })),
      }
    })
  } catch (error) {
    console.error('Users comparison error:', error)
    return NextResponse.json(
      { error: 'データ比較中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
