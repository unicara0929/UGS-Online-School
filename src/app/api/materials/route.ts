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

// GET: ユーザーが閲覧可能な資料を取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const userRole = authUser!.role

    // 管理者は全ての資料を閲覧可能
    if (userRole === 'ADMIN') {
      const materials = await prisma.material.findMany({
        orderBy: { createdAt: 'desc' },
      })

      const formattedMaterials = materials.map((material) => ({
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
      }))

      return NextResponse.json({ success: true, materials: formattedMaterials })
    }

    // 一般ユーザーは自分のロールで閲覧可能な資料のみ取得
    const userViewableRole =
      USER_ROLE_TO_MATERIAL_VIEWABLE_ROLE[userRole as keyof typeof USER_ROLE_TO_MATERIAL_VIEWABLE_ROLE] || 'MEMBER'

    const materials = await prisma.material.findMany({
      where: {
        viewableRoles: {
          has: userViewableRole,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formattedMaterials = materials.map((material) => ({
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
    }))

    return NextResponse.json({ success: true, materials: formattedMaterials })
  } catch (error) {
    console.error('[MATERIALS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '資料の取得に失敗しました' },
      { status: 500 }
    )
  }
}
