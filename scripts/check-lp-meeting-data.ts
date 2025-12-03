import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkData() {
  // LP面談が完了しているユーザーを取得
  const completedMeetings = await prisma.lPMeeting.findMany({
    where: { status: 'COMPLETED' },
    include: { member: { select: { id: true, name: true, email: true } } }
  })

  console.log('=== LP面談完了済みユーザー ===')
  for (const meeting of completedMeetings) {
    const fpApp = await prisma.fPPromotionApplication.findUnique({
      where: { userId: meeting.memberId }
    })
    console.log({
      userId: meeting.memberId,
      userName: meeting.member?.name,
      meetingCompleted: meeting.completedAt,
      fpAppExists: fpApp !== null,
      lpMeetingCompletedFlag: fpApp?.lpMeetingCompleted || false
    })
  }

  await prisma.$disconnect()
}

checkData().catch(console.error)
