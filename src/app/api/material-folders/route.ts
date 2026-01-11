import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// フォルダ一覧取得（ユーザー向け）
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

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
