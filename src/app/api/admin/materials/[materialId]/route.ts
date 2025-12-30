import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

const MATERIAL_VIEWABLE_ROLE_MAP = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  FP: 'fp',
  MEMBER: 'member',
} as const

const MATERIAL_VIEWABLE_ROLE_INPUT_MAP: Record<string, 'ADMIN' | 'MANAGER' | 'FP' | 'MEMBER'> = {
  admin: 'ADMIN',
  manager: 'MANAGER',
  fp: 'FP',
  member: 'MEMBER',
}

// PATCH: 資料を更新（管理者のみ）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { materialId } = await params
    const body = await request.json()
    const {
      title,
      description,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      category,
      viewableRoles,
    } = body || {}

    // 資料が存在するかチェック
    const existingMaterial = await prisma.material.findUnique({
      where: { id: materialId },
    })

    if (!existingMaterial) {
      return NextResponse.json(
        { success: false, error: '資料が見つかりません' },
        { status: 404 }
      )
    }

    // バリデーション
    if (viewableRoles && viewableRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: '閲覧可能ロールを少なくとも1つ選択してください' },
        { status: 400 }
      )
    }

    // 更新データを準備
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl
    if (fileName !== undefined) updateData.fileName = fileName
    if (fileSize !== undefined) updateData.fileSize = fileSize
    if (fileType !== undefined) updateData.fileType = fileType
    if (category !== undefined) updateData.category = category
    if (viewableRoles !== undefined) {
      updateData.viewableRoles = viewableRoles.map(
        (role: string) => MATERIAL_VIEWABLE_ROLE_INPUT_MAP[role] ?? 'MEMBER'
      )
    }

    const updatedMaterial = await prisma.material.update({
      where: { id: materialId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      material: {
        id: updatedMaterial.id,
        title: updatedMaterial.title,
        description: updatedMaterial.description ?? '',
        fileUrl: updatedMaterial.fileUrl ?? '',
        fileName: updatedMaterial.fileName ?? '',
        fileSize: updatedMaterial.fileSize ?? '',
        fileType: updatedMaterial.fileType ?? '',
        category: updatedMaterial.category ?? '',
        viewableRoles: updatedMaterial.viewableRoles.map(
          (role) => MATERIAL_VIEWABLE_ROLE_MAP[role as keyof typeof MATERIAL_VIEWABLE_ROLE_MAP]
        ),
        createdAt: updatedMaterial.createdAt.toISOString(),
        updatedAt: updatedMaterial.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[ADMIN_MATERIALS_PATCH_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '資料の更新に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT: 資料を更新（PATCHと同じ処理）
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ materialId: string }> }
) {
  return PATCH(request, context)
}

// DELETE: 資料を削除（管理者のみ）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { materialId } = await params

    // 資料が存在するかチェック
    const existingMaterial = await prisma.material.findUnique({
      where: { id: materialId },
    })

    if (!existingMaterial) {
      return NextResponse.json(
        { success: false, error: '資料が見つかりません' },
        { status: 404 }
      )
    }

    await prisma.material.delete({
      where: { id: materialId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN_MATERIALS_DELETE_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '資料の削除に失敗しました' },
      { status: 500 }
    )
  }
}
