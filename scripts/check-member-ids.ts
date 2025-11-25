/**
 * 会員番号の付与状況を確認するスクリプト
 */
import { prisma } from '../src/lib/prisma'

async function checkMemberIds() {
  try {
    console.log('会員番号の付与状況を確認中...\n')

    // 全ユーザー数
    const totalUsers = await prisma.user.count()
    console.log(`📊 全ユーザー数: ${totalUsers}`)

    // 会員番号が付与されているユーザー数
    const usersWithMemberId = await prisma.user.count({
      where: {
        memberId: {
          not: null,
        },
      },
    })
    console.log(`✅ 会員番号付与済み: ${usersWithMemberId}`)

    // 会員番号が付与されていないユーザー数
    const usersWithoutMemberId = await prisma.user.count({
      where: {
        memberId: null,
      },
    })
    console.log(`❌ 会員番号未付与: ${usersWithoutMemberId}`)

    // 会員番号が付与されていないユーザーの詳細（最大10件）
    if (usersWithoutMemberId > 0) {
      console.log('\n会員番号未付与のユーザー（最大10件）:')
      const usersWithoutId = await prisma.user.findMany({
        where: {
          memberId: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        take: 10,
      })

      usersWithoutId.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role} - 登録日: ${user.createdAt.toISOString().split('T')[0]}`)
      })

      if (usersWithoutMemberId > 10) {
        console.log(`... 他 ${usersWithoutMemberId - 10} 名`)
      }
    }

    // 最新の会員番号を確認
    const latestMemberId = await prisma.user.findFirst({
      where: {
        memberId: {
          not: null,
        },
      },
      orderBy: {
        memberId: 'desc',
      },
      select: {
        memberId: true,
      },
    })

    if (latestMemberId) {
      console.log(`\n📝 最新の会員番号: ${latestMemberId.memberId}`)
    }

    // 判定結果
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (usersWithoutMemberId === 0) {
      console.log('✅ 判定: 全ユーザーに会員番号が付与されています')
      console.log('→ schema.prisma の memberId を String (必須) に変更可能です')
    } else {
      console.log('⚠️  判定: 会員番号未付与のユーザーが存在します')
      console.log(`→ 先に scripts/assign-member-ids.ts を実行してください`)
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  } catch (error) {
    console.error('エラーが発生しました:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMemberIds()
