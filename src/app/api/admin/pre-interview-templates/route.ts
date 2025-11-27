import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

/**
 * 事前アンケートテンプレート一覧取得
 * GET /api/admin/pre-interview-templates
 * 権限: 管理者のみ
 */
export async function GET(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) return adminError!

    const templates = await prisma.preInterviewTemplate.findMany({
      include: {
        questions: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { responses: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      templates
    })
  } catch (error) {
    console.error('Get pre-interview templates error:', error)
    return NextResponse.json(
      { error: 'テンプレート一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 事前アンケートテンプレート作成
 * POST /api/admin/pre-interview-templates
 * 権限: 管理者のみ
 */
export async function POST(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { isAdmin, error: adminError } = checkAdmin(authUser!.role)
    if (!isAdmin) return adminError!

    const body = await request.json()
    const { name, description, questions } = body

    if (!name || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'テンプレート名と質問項目は必須です' },
        { status: 400 }
      )
    }

    // トランザクションでテンプレートと質問を作成
    const template = await prisma.preInterviewTemplate.create({
      data: {
        name,
        description,
        isActive: true,
        version: 1,
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
      },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      template
    })
  } catch (error) {
    console.error('Create pre-interview template error:', error)
    return NextResponse.json(
      { error: 'テンプレートの作成に失敗しました' },
      { status: 500 }
    )
  }
}
