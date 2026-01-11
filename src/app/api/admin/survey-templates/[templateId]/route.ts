import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// テンプレート取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { templateId } = await params

    const template = await prisma.surveyTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'テンプレートが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        questions: template.questions,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[SURVEY_TEMPLATE_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'テンプレートの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// テンプレート削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { templateId } = await params

    await prisma.surveyTemplate.delete({
      where: { id: templateId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SURVEY_TEMPLATE_DELETE_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'テンプレートの削除に失敗しました' },
      { status: 500 }
    )
  }
}
