import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
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

