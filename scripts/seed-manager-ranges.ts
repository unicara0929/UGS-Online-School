import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting Manager Range seed...')

  // 既存データをupsertで更新または作成
  const ranges = [
    {
      rangeNumber: 1,
      name: 'レンジ1',
      minHalfYearlySales: 0,        // 昇級条件なし（初期レンジ）
      maintainSales: 1200000,       // 維持条件: 120万円
    },
    {
      rangeNumber: 2,
      name: 'レンジ2',
      minHalfYearlySales: 1500000,  // 昇級条件: 150万円
      maintainSales: 1500000,       // 維持条件: 150万円
    },
    {
      rangeNumber: 3,
      name: 'レンジ3',
      minHalfYearlySales: 2400000,  // 昇級条件: 240万円
      maintainSales: 3000000,       // 維持条件: 300万円
    },
  ]

  for (const range of ranges) {
    const result = await prisma.managerRange.upsert({
      where: { rangeNumber: range.rangeNumber },
      update: {
        name: range.name,
        minHalfYearlySales: range.minHalfYearlySales,
        maintainSales: range.maintainSales,
      },
      create: range,
    })
    console.log(`✅ Range ${range.rangeNumber} (${range.name}) created/updated: ${result.id}`)
  }

  console.log('🌱 Manager Range seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
