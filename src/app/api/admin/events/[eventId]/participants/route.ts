import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, RoleGroups, Roles } from '@/lib/auth/api-helpers'

/**
 * イベント参加者一覧取得API
 * 管理者がイベントの参加者リストを取得
 * 内部参加者（登録ユーザー）と外部参加者の両方を含む
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // 管理者またはマネージャーチェック（閲覧権限）
    const { error: roleError } = checkRole(authUser!.role, RoleGroups.MANAGER_AND_ABOVE)
    if (roleError) return roleError

    const { eventId } = await context.params
    const { searchParams } = new URL(request.url)

    // フィルターパラメータ
    const paymentStatus = searchParams.get('status') // PAID, PENDING, FREE, etc.
    const role = searchParams.get('role') // MEMBER, FP, MANAGER
    const participantType = searchParams.get('participantType') // internal, external, all
    const search = searchParams.get('search') // 名前・メールで検索

    // イベント情報を取得（全スケジュール含む）
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        schedules: {
          orderBy: { date: 'asc' },
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // scheduleIdがnullの登録を最初のスケジュールに自動紐付け（旧データ修復）
    const defaultSchedule = event.schedules[0]
    if (defaultSchedule) {
      const nullScheduleRegistrations = await prisma.eventRegistration.findMany({
        where: { eventId, scheduleId: null },
        select: { id: true },
      })
      if (nullScheduleRegistrations.length > 0) {
        await prisma.eventRegistration.updateMany({
          where: { eventId, scheduleId: null },
          data: { scheduleId: defaultSchedule.id },
        })
      }

      const nullScheduleExternalRegs = await prisma.externalEventRegistration.findMany({
        where: { eventId, scheduleId: null },
        select: { id: true },
      })
      if (nullScheduleExternalRegs.length > 0) {
        await prisma.externalEventRegistration.updateMany({
          where: { eventId, scheduleId: null },
          data: { scheduleId: defaultSchedule.id },
        })
      }
    }

    // 内部参加者を取得（フィルター適用）
    let internalParticipants: any[] = []
    if (!participantType || participantType === 'all' || participantType === 'internal') {
      const whereClause: any = {
        eventId: eventId,
      }

      // 支払いステータスフィルター
      if (paymentStatus && paymentStatus !== 'all') {
        whereClause.paymentStatus = paymentStatus
      }

      // ユーザーのロールと検索条件
      const userWhereClause: any = {}
      if (role && role !== 'all') {
        userWhereClause.role = role.toUpperCase()
      }
      if (search) {
        userWhereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }

      const registrations = await prisma.eventRegistration.findMany({
        where: {
          ...whereClause,
          ...(Object.keys(userWhereClause).length > 0 ? { user: userWhereClause } : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              manager: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          schedule: {
            select: {
              id: true,
              date: true,
              time: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      internalParticipants = registrations.map((reg) => ({
        id: reg.id,
        isExternal: false,
        userId: reg.user.id,
        userName: reg.user.name,
        userEmail: reg.user.email,
        userRole: reg.user.role,
        userPhone: null,
        managerId: reg.user.manager?.id || null,
        managerName: reg.user.manager?.name || null,
        paymentStatus: reg.paymentStatus,
        paidAmount: reg.paidAmount,
        registeredAt: reg.createdAt.toISOString(),
        paidAt: reg.paidAt?.toISOString() || null,
        canceledAt: reg.canceledAt?.toISOString() || null,
        cancelReason: reg.cancelReason || null,
        scheduleId: reg.scheduleId || null,
        scheduleDate: reg.schedule?.date?.toISOString() || null,
        scheduleTime: reg.schedule?.time || null,
      }))
    }

    // 外部参加者を取得（roleフィルターがかかっている場合は除外）
    let externalParticipants: any[] = []
    if ((!participantType || participantType === 'all' || participantType === 'external') && (!role || role === 'all')) {
      const externalWhereClause: any = {
        eventId: eventId,
      }

      // 支払いステータスフィルター
      if (paymentStatus && paymentStatus !== 'all') {
        externalWhereClause.paymentStatus = paymentStatus
      }

      // 検索条件
      if (search) {
        externalWhereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }

      const externalRegistrations = await prisma.externalEventRegistration.findMany({
        where: externalWhereClause,
        include: {
          schedule: {
            select: {
              id: true,
              date: true,
              time: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      externalParticipants = externalRegistrations.map((reg) => ({
        id: reg.id,
        isExternal: true,
        userId: null,
        userName: reg.name,
        userEmail: reg.email,
        userRole: 'EXTERNAL',
        userPhone: reg.phone,
        managerId: null,
        managerName: null,
        referrer: reg.referrer || null,
        customFieldAnswers: reg.customFieldAnswers || null,
        paymentStatus: reg.paymentStatus,
        paidAmount: reg.paidAmount,
        registeredAt: reg.createdAt.toISOString(),
        paidAt: reg.paidAt?.toISOString() || null,
        canceledAt: null,
        cancelReason: null,
        scheduleId: reg.scheduleId || null,
        scheduleDate: reg.schedule?.date?.toISOString() || null,
        scheduleTime: reg.schedule?.time || null,
      }))
    }

    // 内部・外部参加者を結合して日時順でソート
    const allParticipants = [...internalParticipants, ...externalParticipants]
      .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())

    // サマリー情報を計算（全参加者）
    const allRegistrations = await prisma.eventRegistration.findMany({
      where: { eventId },
    })
    const allExternalRegistrations = await prisma.externalEventRegistration.findMany({
      where: { eventId },
    })

    const summary = {
      totalCount: allRegistrations.length + allExternalRegistrations.length,
      internalCount: allRegistrations.length,
      externalCount: allExternalRegistrations.length,
      paidCount: allRegistrations.filter((r) => r.paymentStatus === 'PAID').length +
        allExternalRegistrations.filter((r) => r.paymentStatus === 'PAID').length,
      pendingCount: allRegistrations.filter((r) => r.paymentStatus === 'PENDING').length +
        allExternalRegistrations.filter((r) => r.paymentStatus === 'PENDING').length,
      freeCount: allRegistrations.filter((r) => r.paymentStatus === 'FREE').length +
        allExternalRegistrations.filter((r) => r.paymentStatus === 'FREE').length,
      refundedCount: allRegistrations.filter((r) => r.paymentStatus === 'REFUNDED').length +
        allExternalRegistrations.filter((r) => r.paymentStatus === 'REFUNDED').length,
    }

    const firstSchedule = event.schedules[0]
    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        date: firstSchedule?.date?.toISOString() ?? null,
        time: firstSchedule?.time || '',
        isPaid: event.isPaid,
        price: event.price,
        isRecurring: event.isRecurring || false,
        allowExternalParticipation: event.allowExternalParticipation || false,
        externalFormFields: event.externalFormFields || null,
        eventCategory: event.eventCategory || 'REGULAR',
        schedules: event.schedules.map((s) => ({
          id: s.id,
          date: s.date?.toISOString() ?? null,
          time: s.time || '',
        })),
      },
      summary,
      participants: allParticipants,
    })
  } catch (error) {
    console.error('Get event participants error:', error)
    return NextResponse.json(
      { error: '参加者一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * イベント参加登録の一括削除API
 * 管理者が選択した参加登録を削除
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const { error: roleError } = checkRole(authUser!.role, RoleGroups.ADMIN_ONLY)
    if (roleError) return roleError

    const { eventId } = await context.params
    const body = await request.json()
    const { registrationIds } = body as { registrationIds: string[] }

    if (!registrationIds || registrationIds.length === 0) {
      return NextResponse.json(
        { error: '削除する参加登録を選択してください' },
        { status: 400 }
      )
    }

    // イベントの存在確認
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }

    // 内部参加登録を削除
    const internalDeleted = await prisma.eventRegistration.deleteMany({
      where: {
        id: { in: registrationIds },
        eventId: eventId,
      },
    })

    // 外部参加登録を削除
    const externalDeleted = await prisma.externalEventRegistration.deleteMany({
      where: {
        id: { in: registrationIds },
        eventId: eventId,
      },
    })

    const deletedCount = internalDeleted.count + externalDeleted.count

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount}件の参加登録を削除しました`,
    })
  } catch (error) {
    console.error('Delete event registrations error:', error)
    return NextResponse.json(
      { error: '参加登録の削除に失敗しました' },
      { status: 500 }
    )
  }
}
