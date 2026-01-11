import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// NEW判定の日数
const NEW_BADGE_DAYS = 7

const MATERIAL_VIEWABLE_ROLE_MAP = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  FP: 'fp',
  MEMBER: 'member',
} as const

// ユーザーロールをMaterialViewableRoleにマッピング
const USER_ROLE_TO_MATERIAL_VIEWABLE_ROLE = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  FP: 'FP',
  MEMBER: 'MEMBER',
} as const

// GET: ユーザーが閲覧可能な資料を取得（フォルダ対応）
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const userRole = authUser!.role
    const userId = authUser!.id

    // フォルダIDを取得
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    // ユーザーの資料閲覧履歴を取得
    const viewedMaterialIds = (await prisma.userContentView.findMany({
      where: {
        userId,
        contentType: 'MATERIAL',
      },
      select: { contentId: true },
    })).map((v) => v.contentId)

    // NEW判定の基準日時
    const newBadgeThreshold = new Date()
    newBadgeThreshold.setDate(newBadgeThreshold.getDate() - NEW_BADGE_DAYS)

    // ユーザーのロールに基づくフィルター条件
    const userViewableRole =
      USER_ROLE_TO_MATERIAL_VIEWABLE_ROLE[userRole as keyof typeof USER_ROLE_TO_MATERIAL_VIEWABLE_ROLE] || 'MEMBER'

    // 管理者は全ての資料を閲覧可能、それ以外はロールでフィルター
    const whereCondition = userRole === 'ADMIN'
      ? { folderId: folderId || null }
      : {
          folderId: folderId || null,
          viewableRoles: { has: userViewableRole },
        }

    const materials = await prisma.material.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
    })

    const formattedMaterials = materials.map((material) => {
      const isNew = material.updatedAt >= newBadgeThreshold && !viewedMaterialIds.includes(material.id)
      return {
        id: material.id,
        title: material.title,
        description: material.description ?? '',
        fileUrl: material.fileUrl ?? '',
        fileName: material.fileName ?? '',
        fileSize: material.fileSize ?? '',
        fileType: material.fileType ?? '',
        category: material.category ?? '',
        folderId: material.folderId,
        viewableRoles: material.viewableRoles.map(
          (role) => MATERIAL_VIEWABLE_ROLE_MAP[role as keyof typeof MATERIAL_VIEWABLE_ROLE_MAP]
        ),
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
        isNew,
      }
    })

    return NextResponse.json({ success: true, materials: formattedMaterials })
  } catch (error) {
    console.error('[MATERIALS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '資料の取得に失敗しました' },
      { status: 500 }
    )
  }
}
