/**
 * 未申請のFPPromotionApplicationレコードのappliedAtをnullに更新するスクリプト
 *
 * LP面談完了時にレコードが作成される際、デフォルト値でappliedAtが設定されてしまっていた問題を修正
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('Checking FPPromotionApplication records...')

  // 全レコードを確認
  const allRecords = await prisma.fPPromotionApplication.findMany({
    select: {
      id: true,
      userId: true,
      status: true,
      lpMeetingCompleted: true,
      surveyCompleted: true,
      appliedAt: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })

  console.log(`Found ${allRecords.length} records total`)

  // 条件: lpMeetingCompletedがtrueだが、surveyCompletedがfalseで、appliedAtがnullでないレコード
  // これらは「条件達成中だが未申請」の状態であるべき
  const recordsToFix = allRecords.filter(
    r => r.lpMeetingCompleted === true && r.surveyCompleted === false && r.appliedAt !== null
  )

  console.log(`Found ${recordsToFix.length} records to fix:`)

  for (const record of recordsToFix) {
    console.log(`  - User: ${record.user.name} (${record.user.email})`)
    console.log(`    lpMeetingCompleted: ${record.lpMeetingCompleted}, surveyCompleted: ${record.surveyCompleted}`)
    console.log(`    appliedAt: ${record.appliedAt}`)
  }

  if (recordsToFix.length === 0) {
    console.log('No records to fix.')
    return
  }

  // 修正を実行
  console.log('\nFixing records...')

  for (const record of recordsToFix) {
    await prisma.fPPromotionApplication.update({
      where: { id: record.id },
      data: { appliedAt: null }
    })
    console.log(`  ✓ Fixed: ${record.user.name}`)
  }

  console.log('\nDone!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
