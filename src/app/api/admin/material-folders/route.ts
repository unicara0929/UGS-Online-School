import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// フォルダ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    const folders = await prisma.materialFolder.findMany({
      where: {
        parentId: parentId || null,
      },
      include: {
        _count: {
          select: {
            children: true,
            materials: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        childCount: f._count.children,
        materialCount: f._count.materials,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[MATERIAL_FOLDERS_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'フォルダの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// フォルダ作成
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const { name, parentId } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'フォルダ名は必須です' },
        { status: 400 }
      )
    }

    // 親フォルダの存在確認
    if (parentId) {
      const parentFolder = await prisma.materialFolder.findUnique({
        where: { id: parentId },
      })
      if (!parentFolder) {
        return NextResponse.json(
          { success: false, error: '親フォルダが見つかりません' },
          { status: 404 }
        )
      }
    }

    const folder = await prisma.materialFolder.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
      },
    })

    return NextResponse.json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[MATERIAL_FOLDERS_POST_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'フォルダの作成に失敗しました' },
      { status: 500 }
    )
  }
}
