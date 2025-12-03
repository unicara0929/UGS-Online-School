import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixLpMeetingFlags() {
  // LP面談が完了しているユーザーを取得
  const completedMeetings = await prisma.lPMeeting.findMany({
    where: { status: 'COMPLETED' },
    select: { memberId: true, completedAt: true }
  })

  console.log(`LP面談完了済みユーザー数: ${completedMeetings.length}`)

  for (const meeting of completedMeetings) {
    // FPPromotionApplicationを確認・作成/更新
    const existingApp = await prisma.fPPromotionApplication.findUnique({
      where: { userId: meeting.memberId }
    })

    if (!existingApp) {
      // 新規作成
      await prisma.fPPromotionApplication.create({
        data: {
          userId: meeting.memberId,
          lpMeetingCompleted: true
        }
      })
      console.log(`✅ 作成: userId=${meeting.memberId}, lpMeetingCompleted=true`)
    } else if (!existingApp.lpMeetingCompleted) {
      // 更新
      await prisma.fPPromotionApplication.update({
        where: { userId: meeting.memberId },
        data: { lpMeetingCompleted: true }
      })
      console.log(`✅ 更新: userId=${meeting.memberId}, lpMeetingCompleted=true`)
    } else {
      console.log(`⏭️ スキップ: userId=${meeting.memberId} (既にtrue)`)
    }
  }

  console.log('完了')
  await prisma.$disconnect()
}

fixLpMeetingFlags().catch(console.error)
