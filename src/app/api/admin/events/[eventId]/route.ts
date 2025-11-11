import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkAdmin } from '@/lib/auth/api-helpers'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者チェック
    const { error: adminError } = checkAdmin(authUser!.role)
    if (adminError) return adminError

    const { eventId } = await params

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId が指定されていません' },
        { status: 400 }
      )
    }

    await prisma.event.delete({
      where: { id: eventId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN_EVENTS_DELETE_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'イベントの削除に失敗しました' },
      { status: 500 }
    )
  }
}

