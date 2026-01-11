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

// GET: 資料を取得（管理者用、フォルダ指定対応）
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    const materials = await prisma.material.findMany({
      where: {
        folderId: folderId || null,
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
      folderId: material.folderId,
      viewableRoles: material.viewableRoles.map(
        (role) => MATERIAL_VIEWABLE_ROLE_MAP[role as keyof typeof MATERIAL_VIEWABLE_ROLE_MAP]
      ),
      createdAt: material.createdAt.toISOString(),
      updatedAt: material.updatedAt.toISOString(),
    }))

    return NextResponse.json({ success: true, materials: formattedMaterials })
  } catch (error) {
    console.error('[ADMIN_MATERIALS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '資料の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST: 新規資料を作成（管理者のみ）
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const body = await request.json()
    const {
      title,
      description,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      category,
      folderId,
      viewableRoles = [],
    } = body || {}

    // バリデーション
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'タイトルは必須です' },
        { status: 400 }
      )
    }

    if (!viewableRoles || viewableRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: '閲覧可能ロールを少なくとも1つ選択してください' },
        { status: 400 }
      )
    }

    // ロールをデータベース用に変換
    const dbViewableRoles = viewableRoles.map(
      (role: string) => MATERIAL_VIEWABLE_ROLE_INPUT_MAP[role] ?? 'MEMBER'
    )

    const createdMaterial = await prisma.material.create({
      data: {
        title,
        description,
        fileUrl,
        fileName,
        fileSize,
        fileType,
        category,
        folderId: folderId || null,
        viewableRoles: dbViewableRoles,
      },
    })

    // 新着通知を作成
    try {
      // viewableRoles を UserRole に変換
      const notificationTargetRoles = dbViewableRoles.map((role: 'ADMIN' | 'MANAGER' | 'FP' | 'MEMBER') => {
        if (role === 'ADMIN') return 'ADMIN'
        if (role === 'MANAGER') return 'MANAGER'
        if (role === 'FP') return 'FP'
        return 'MEMBER'
      })

      await prisma.systemNotification.create({
        data: {
          type: 'MATERIAL_ADDED',
          title: `新しい資料「${title}」が追加されました`,
          contentType: 'MATERIAL',
          contentId: createdMaterial.id,
          targetUrl: `/dashboard/materials/${createdMaterial.id}`,
          targetRoles: notificationTargetRoles,
        }
      })
    } catch (notificationError) {
      console.error('[MATERIAL_NOTIFICATION_ERROR]', notificationError)
      // 通知作成失敗は資料作成の失敗とはしない（ログのみ）
    }

    return NextResponse.json({
      success: true,
      material: {
        id: createdMaterial.id,
        title: createdMaterial.title,
        description: createdMaterial.description ?? '',
        fileUrl: createdMaterial.fileUrl ?? '',
        fileName: createdMaterial.fileName ?? '',
        fileSize: createdMaterial.fileSize ?? '',
        fileType: createdMaterial.fileType ?? '',
        category: createdMaterial.category ?? '',
        folderId: createdMaterial.folderId,
        viewableRoles: createdMaterial.viewableRoles.map(
          (role) => MATERIAL_VIEWABLE_ROLE_MAP[role as keyof typeof MATERIAL_VIEWABLE_ROLE_MAP]
        ),
        createdAt: createdMaterial.createdAt.toISOString(),
        updatedAt: createdMaterial.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[ADMIN_MATERIALS_POST_ERROR]', error)
    return NextResponse.json(
      { success: false, error: '資料の作成に失敗しました' },
      { status: 500 }
    )
  }
}
