import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// お問い合わせ詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { contactId } = await params

    const submission = await prisma.contactSubmission.findUnique({
      where: { id: contactId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ success: false, error: 'お問い合わせが見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ success: true, submission })
  } catch (error) {
    console.error('Error fetching contact submission:', error)
    return NextResponse.json({ success: false, error: 'お問い合わせの取得に失敗しました' }, { status: 500 })
  }
}

// お問い合わせ更新（ステータス変更、メモ追加）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { contactId } = await params
    const body = await request.json()
    const { status, adminNotes } = body

    const updateData: any = {}

    if (status) {
      updateData.status = status
      // 対応完了時の情報を記録
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updateData.respondedBy = user!.id
        updateData.respondedAt = new Date()
      }
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes
    }

    const submission = await prisma.contactSubmission.update({
      where: { id: contactId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, submission })
  } catch (error) {
    console.error('Error updating contact submission:', error)
    return NextResponse.json({ success: false, error: 'お問い合わせの更新に失敗しました' }, { status: 500 })
  }
}
