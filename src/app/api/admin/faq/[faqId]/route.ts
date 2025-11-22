import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

// FAQ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ faqId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { faqId } = await params
    const body = await request.json()
    const { categoryId, question, answer, order, isPublished } = body

    const faq = await prisma.fAQ.update({
      where: { id: faqId },
      data: {
        ...(categoryId && { categoryId }),
        ...(question && { question }),
        ...(answer && { answer }),
        ...(order !== undefined && { order }),
        ...(isPublished !== undefined && { isPublished }),
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json({ success: true, faq })
  } catch (error) {
    console.error('Error updating FAQ:', error)
    return NextResponse.json({ success: false, error: 'FAQの更新に失敗しました' }, { status: 500 })
  }
}

// FAQ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ faqId: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 })
    }

    const { faqId } = await params

    await prisma.fAQ.delete({
      where: { id: faqId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting FAQ:', error)
    return NextResponse.json({ success: false, error: 'FAQの削除に失敗しました' }, { status: 500 })
  }
}
