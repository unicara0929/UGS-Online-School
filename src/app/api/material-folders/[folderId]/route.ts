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

    const { folderId } = await params

    const folder = await prisma.materialFolder.findUnique({
      where: { id: folderId },
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
