import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// フォルダ取得（パンくずリスト用）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { folderId } = await params

    const folder = await prisma.materialFolder.findUnique({
      where: { id: folderId },
      include: {
        parent: true,
      },
    })

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'フォルダが見つかりません' },
        { status: 404 }
      )
    }

    // パンくずリストを構築
    type FolderBreadcrumb = { id: string; name: string; parentId: string | null }
    const breadcrumbs: { id: string; name: string }[] = []
    let current: FolderBreadcrumb | null = { id: folder.id, name: folder.name, parentId: folder.parentId }

    while (current) {
      breadcrumbs.unshift({ id: current.id, name: current.name })
      if (current.parentId) {
        const parentFolder: FolderBreadcrumb | null = await prisma.materialFolder.findUnique({
          where: { id: current.parentId },
          select: { id: true, name: true, parentId: true },
        })
        current = parentFolder
      } else {
        current = null
      }
    }

    return NextResponse.json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
      },
      breadcrumbs,
    })
  } catch (error) {
    console.error('[MATERIAL_FOLDER_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'フォルダの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// フォルダ更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { folderId } = await params
    const body = await request.json()
    const { name, parentId } = body

    const folder = await prisma.materialFolder.findUnique({
      where: { id: folderId },
    })

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'フォルダが見つかりません' },
        { status: 404 }
      )
    }

    // 自分自身を親フォルダに設定しようとしていないか確認
    if (parentId === folderId) {
      return NextResponse.json(
        { success: false, error: '自分自身を親フォルダに設定することはできません' },
        { status: 400 }
      )
    }

    const updateData: { name?: string; parentId?: string | null } = {}
    if (name !== undefined) updateData.name = name.trim()
    if (parentId !== undefined) updateData.parentId = parentId || null

    const updatedFolder = await prisma.materialFolder.update({
      where: { id: folderId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      folder: {
        id: updatedFolder.id,
        name: updatedFolder.name,
        parentId: updatedFolder.parentId,
        createdAt: updatedFolder.createdAt.toISOString(),
        updatedAt: updatedFolder.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[MATERIAL_FOLDER_PATCH_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'フォルダの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// フォルダ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { folderId } = await params

    const folder = await prisma.materialFolder.findUnique({
      where: { id: folderId },
      include: {
        _count: {
          select: {
            children: true,
            materials: true,
          },
        },
      },
    })

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'フォルダが見つかりません' },
        { status: 404 }
      )
    }

    // フォルダ内に資料がある場合はルートに移動
    if (folder._count.materials > 0) {
      await prisma.material.updateMany({
        where: { folderId },
        data: { folderId: null },
      })
    }

    // サブフォルダがある場合は親フォルダを引き継ぐ
    if (folder._count.children > 0) {
      await prisma.materialFolder.updateMany({
        where: { parentId: folderId },
        data: { parentId: folder.parentId },
      })
    }

    await prisma.materialFolder.delete({
      where: { id: folderId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MATERIAL_FOLDER_DELETE_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'フォルダの削除に失敗しました' },
      { status: 500 }
    )
  }
}
