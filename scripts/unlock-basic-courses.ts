/**
 * 実践スキル・スタートアップ支援の基礎編をメンバーに開放するスクリプト
 *
 * 実行方法: npx tsx scripts/unlock-basic-courses.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 現在のコース状況を確認
  const courses = await prisma.course.findMany({
    orderBy: [{ category: 'asc' }, { level: 'asc' }],
    select: {
      id: true,
      title: true,
      category: true,
      level: true,
      isLocked: true,
      viewableRoles: true
    }
  })

  console.log('=== 現在のコース状況 ===')
  for (const course of courses) {
    const roles = course.viewableRoles.length > 0 ? course.viewableRoles.join(', ') : '(全員)'
    console.log(`${course.category} / ${course.level}: "${course.title}"`)
    console.log(`  isLocked: ${course.isLocked}, viewableRoles: [${roles}]`)
  }

  // 実践スキル(PRACTICAL_SKILL)とスタートアップ支援(STARTUP_SUPPORT)の基礎編(BASIC)を
  // 全員閲覧可能に更新（viewableRolesを空に、isLockedをfalseに）
  console.log('\n=== 更新処理 ===')

  const updated = await prisma.course.updateMany({
    where: {
      category: { in: ['PRACTICAL_SKILL', 'STARTUP_SUPPORT'] },
      level: 'BASIC'
    },
    data: {
      isLocked: false,
      viewableRoles: []
    }
  })

  console.log(`${updated.count}件のコースを更新しました`)

  // 更新後の状態を確認
  const updatedCourses = await prisma.course.findMany({
    where: {
      category: { in: ['PRACTICAL_SKILL', 'STARTUP_SUPPORT'] },
      level: 'BASIC'
    },
    select: {
      id: true,
      title: true,
      category: true,
      level: true,
      isLocked: true,
      viewableRoles: true
    }
  })

  console.log('\n=== 更新後の状態 ===')
  for (const course of updatedCourses) {
    const roles = course.viewableRoles.length > 0 ? course.viewableRoles.join(', ') : '(全員)'
    console.log(`${course.category} / ${course.level}: "${course.title}"`)
    console.log(`  isLocked: ${course.isLocked}, viewableRoles: [${roles}]`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
