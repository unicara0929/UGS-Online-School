import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

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

// GET: 特定の資料を取得（閲覧権限チェックあり）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { materialId } = await params
    const userRole = authUser!.role

    // 資料を取得
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    })

    if (!material) {
      return NextResponse.json(
        { success: false, error: '資料が見つかりません' },
        { status: 404 }
      )
    }

    // 管理者は全ての資料を閲覧可能
    if (userRole === 'ADMIN') {
      return NextResponse.json({
        success: true,
        material: {
          id: material.id,
          title: material.title,
          description: material.description ?? '',
          fileUrl: material.fileUrl ?? '',
          fileName: material.fileName ?? '',
          fileSize: material.fileSize ?? '',
          fileType: material.fileType ?? '',
          category: material.category ?? '',
          viewableRoles: material.viewableRoles.map(
            (role) => MATERIAL_VIEWABLE_ROLE_MAP[role as keyof typeof MATERIAL_VIEWABLE_ROLE_MAP]
          ),
          createdAt: material.createdAt.toISOString(),
          updatedAt: material.updatedAt.toISOString(),
        },
      })
    }

    // 閲覧権限チェック
    const userViewableRole =
      USER_ROLE_TO_MATERIAL_VIEWABLE_ROLE[userRole as keyof typeof USER_ROLE_TO_MATERIAL_VIEWABLE_ROLE] || 'MEMBER'

    if (!material.viewableRoles.includes(userViewableRole)) {
      return NextResponse.json(
        { success: false, error: 'この資料を閲覧する権限がありません' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      material: {
        id: material.id,
        title: material.title,
        description: material.description ?? '',
        fileUrl: material.fileUrl ?? '',
        fileName: material.fileName ?? '',
        fileSize: material.fileSize ?? '',
        fileType: material.fileType ?? '',
        category: material.category ?? '',
        viewableRoles: material.viewableRoles.map(
          (role) => MATERIAL_VIEWABLE_ROLE_MAP[role as keyof typeof MATERIAL_VIEWABLE_ROLE_MAP]
        ),
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[MATERIAL_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '資料の取得に失敗しました' },
      { status: 500 }
    )
  }
}
