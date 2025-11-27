import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 事前アンケートテンプレート詳細取得
 * GET /api/admin/pre-interview-templates/[id]
 * 権限: 管理者のみ
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) return adminError!

    const { id } = await params

    const template = await prisma.preInterviewTemplate.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { responses: true }
        }
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'テンプレートが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      template
    })
  } catch (error) {
    console.error('Get pre-interview template error:', error)
    return NextResponse.json(
      { error: 'テンプレートの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 事前アンケートテンプレート更新
 * PUT /api/admin/pre-interview-templates/[id]
 * 権限: 管理者のみ
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) return adminError!

    const { id } = await params
    const body = await request.json()
    const { name, description, isActive, questions } = body

    // 既存テンプレートの確認
    const existingTemplate = await prisma.preInterviewTemplate.findUnique({
      where: { id },
      include: { questions: true }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'テンプレートが見つかりません' },
        { status: 404 }
      )
    }

    // トランザクションで更新
    const template = await prisma.$transaction(async (tx) => {
      // 質問が更新される場合、既存の質問を削除して新しい質問を作成
      if (questions && Array.isArray(questions)) {
        await tx.preInterviewQuestion.deleteMany({
          where: { templateId: id }
        })
      }

      return tx.preInterviewTemplate.update({
        where: { id },
        data: {
          name: name || existingTemplate.name,
          description: description !== undefined ? description : existingTemplate.description,
          isActive: isActive !== undefined ? isActive : existingTemplate.isActive,
          version: existingTemplate.version + 1,
          ...(questions && Array.isArray(questions) ? {
            questions: {
              create: questions.map((q: any, index: number) => ({
                order: index + 1,
                category: q.category || null,
                question: q.question,
                description: q.description || null,
                type: q.type,
                options: q.options || null,
                required: q.required || false,
                showIf: q.showIf || null
              }))
            }
          } : {})
        },
        include: {
          questions: {
            orderBy: { order: 'asc' }
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      template
    })
  } catch (error) {
    console.error('Update pre-interview template error:', error)
    return NextResponse.json(
      { error: 'テンプレートの更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 事前アンケートテンプレート削除
 * DELETE /api/admin/pre-interview-templates/[id]
 * 権限: 管理者のみ
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) return adminError!

    const { id } = await params

    // 使用中の確認
    const responseCount = await prisma.preInterviewResponse.count({
      where: { templateId: id }
    })

    if (responseCount > 0) {
      return NextResponse.json(
        { error: `このテンプレートは${responseCount}件の回答で使用されているため削除できません。無効化してください。` },
        { status: 400 }
      )
    }

    await prisma.preInterviewTemplate.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'テンプレートを削除しました'
    })
  } catch (error) {
    console.error('Delete pre-interview template error:', error)
    return NextResponse.json(
      { error: 'テンプレートの削除に失敗しました' },
      { status: 500 }
    )
  }
}
